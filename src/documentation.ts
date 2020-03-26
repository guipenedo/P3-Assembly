import * as fs from 'fs';
import * as path from 'path';

export class P3DocumentationManager {
    instructions = new Map<string, P3DocumentationInstruction>();
    registers = new Map<string, P3DocumentationRegister>();
    private extensionPath: string;

    constructor(extensionPath: string) {
        this.extensionPath = extensionPath;
    }
    
    public load(): Promise<void> {
        return new Promise(async (resolve, _reject) => {
            const filePathInstructions = path.join(this.extensionPath, 'docs', 'instructions.csv');
            let buffer = fs.readFileSync(filePathInstructions, 'utf8');
            let lines = buffer.toString().split(/\r\n|\r|\n/g);
            let lineIndex = 0;
            for (let line of lines) {
                if (line.length > 0) 
                    try {
                        let inst = new P3DocumentationInstruction(line);
                        this.instructions.set(inst.name, inst);
                    } catch(err){
                        console.error('Error parsing file \'instructionsset.csv\' on line [' + lineIndex + ']: \'' + line + '\'');
                        throw err;
                    }
                lineIndex++;
            }

            const filePathRegisters = path.join(this.extensionPath, 'docs', 'registers.csv');
            buffer = fs.readFileSync(filePathRegisters, 'utf8');
            lines = buffer.toString().split(/\r\n|\r|\n/g);
            lineIndex = 0;
            for (let line of lines) {
                if (line.length > 0) 
                    try {
                        let reg = new P3DocumentationRegister(line);
                        for(var alias of reg.alias)
                            this.registers.set(alias, reg);
                        this.registers.set(reg.name, reg);
                    } catch(err){
                        console.error('Error parsing file \'registers.csv\' on line [' + lineIndex + ']: \'' + line + '\'');
                        throw err;
                    }
                
                lineIndex++;
            }
            resolve();
        });
    }
}

export class P3DocumentationRegister {
    name: string = '';
    description: string = '';
    alias: string[];

    constructor(inst: string){
        let comps = inst.split(';');
        this.name = comps[0].toUpperCase();
        this.description = comps[1];
        this.alias = comps[2].split(',');
    }
}

export class P3DocumentationInstruction {
    static possibleFlags = ['Z', 'C', 'N', 'O', 'E'];

    name: string = '';
    format: string = '';
    description: string = '';
    flags: string = '';
    pseudo: boolean = false;

    constructor(inst: string){
        let comps = inst.split(';');
        this.name = comps[0].toUpperCase();
        this.format = comps[1];
        this.description = comps[2];
        let flagmask = comps[3].toUpperCase();
        for(let flag of P3DocumentationInstruction.possibleFlags)
            if(flagmask.indexOf(flag) >= 0)
                this.flags += flag;
        this.pseudo = comps[4] === 'true';
    }
}