import * as vscode from 'vscode';
import {P3DocumentationManager, P3DocumentationInstruction, P3DocumentationRegister} from './documentation';
import {P3Line} from './parser';

/**
 * Hover provider class
 */
export class P3HoverProvider implements vscode.HoverProvider {
    documentationManager: P3DocumentationManager;

    constructor(documentationManager: P3DocumentationManager){
        this.documentationManager = documentationManager;
    }

    /**
     * Main hover function
     * @param document Document to be formatted
     * @param position Mouse position
     * @param token
     * @return Hover results
     */
    public async provideHover(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): Promise<vscode.Hover> {
        return new Promise(resolve => {
            this.documentationManager.findDefinition(document, position, token).then(defPosition => {
                // start by looking for an actual definition (variable/label)
                if(defPosition){
                    let msg = new vscode.MarkdownString();
                    msg.appendCodeblock(document.lineAt(defPosition.line).text);
                    msg.appendMarkdown('**ctrl+click** para *saltar* (**cmd+click** no macOS)');
                    resolve(new vscode.Hover(msg));
                }
                let line = document.lineAt(position.line);
                let p3Line = new P3Line(line.text, line);
                if (p3Line.instructionRange && p3Line.instructionRange.contains(position) && (p3Line.instruction.length > 0)) {
                    let op = p3Line.instruction;
                    //remove jump conditions, among others
                    if(op.indexOf('.') >= 0)
                        op = op.substr(0, op.indexOf('.'));
                    if (token.isCancellationRequested) 
                        resolve();
                    //if this is indeed an instruction
                    let inst = this.documentationManager.instructions.get(op);
                    if(inst)
                        resolve(new vscode.Hover(this.renderInstruction(inst)));
                } else if (p3Line.dataRange && p3Line.dataRange.contains(position)) {
                    let registers = p3Line.getRegistersFromData();
                    for(var reg of registers){
                        let register = this.documentationManager.registers.get(reg[0]);
                        if(reg[1] && reg[1].contains(position) && register)
                            resolve(new vscode.Hover(this.renderRegister(register)));
                    }
                    console.log('HERE YA GO M8');
                    this.parseConstant(document, position, resolve);
                } else if (p3Line.valueRange && p3Line.valueRange.contains(position)) 
                    this.parseConstant(document, position, resolve);
                resolve();
            });
        });
    }

    public async parseConstant(document: vscode.TextDocument, position: vscode.Position, resolve: (hover?: vscode.Hover) => any){
        let constant = document.getText(document.getWordRangeAtPosition(position));
        if(!constant) resolve();
        console.log('constant:' + constant);
        let values = new Array<number>();
        let number;

        //check binary
        if(RegExp('[01]+b').test(constant))
            number = parseInt(constant, 2);
        
        //check octal
        if(RegExp('[0-7]+o').test(constant))
            number = parseInt(constant, 8);

        //check hex
        else if(RegExp('[0-9A-Fa-f]{1,4}h').test(constant))
            number = parseInt(constant.substr(0, constant.length - 1), 16);
        
        //check decimal
        else if(RegExp('^-?[0-9]+').test(constant))
            number = parseInt(constant);
        
        if(number !== undefined){
            if(number >= 0 && number & 0x8000)
                // isto é um numero negativo pa, toca a converter
                number -= 65536;
            values.push(number);
        }

        //check string
        else if(constant.length > 0 && constant[0] === '\'' && constant[constant.length - 1] === '\'')
            for(let c = 1; c < constant.length - 1; c++){
                let code = constant.codePointAt(c);
                if(code)
                    values.push(code);
            }
        else
            return resolve();
        resolve(new vscode.Hover(this.renderConstants(values)));
    }

    public renderConstants(values: Array<number>): Array<vscode.MarkdownString>{
        let rendered = new Array<vscode.MarkdownString>();
        for(let c of values){
            let complement = c < 0 ? c + 65536 : c;
            let line = '**Dec**: ' + c + ' | **Hex**: ' + complement.toString(16).toUpperCase().padStart(4, '0') + 'h' + (isNaN(c) || c < 0 || c >= 0x10FFFF ? '' : ' | **Char**: ' + String.fromCodePoint(c)) + ' | **Bin**: ' + complement.toString(2) + 'b';
            rendered.push(new vscode.MarkdownString(line));
        }
        return rendered;
    }

    public renderRegister(reg: P3DocumentationRegister): Array<vscode.MarkdownString>{
        let rendered = new Array<vscode.MarkdownString>();
        rendered.push(new vscode.MarkdownString('Register **' + reg.name + '** ' + (reg.alias.length ? '(' + reg.alias.join(', ') + ')' : '')));
        rendered.push(new vscode.MarkdownString(reg.description));
        return rendered;
    }

    public renderInstruction(inst: P3DocumentationInstruction): Array<vscode.MarkdownString>{
        let rendered = new Array<vscode.MarkdownString>();
        let top = '**' + inst.name + '**' + (inst.pseudo ? ' (Pseudo-instrução)' : '') + ': *' + inst.format + '*';
        rendered.push(new vscode.MarkdownString(top));
        if(inst.flags){
            let flags = '**Flags**: ' + inst.flags;
            rendered.push(new vscode.MarkdownString(flags));
        }
        rendered.push(new vscode.MarkdownString(inst.description));
        return rendered;
    }
}