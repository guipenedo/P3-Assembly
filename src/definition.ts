import * as vscode from 'vscode';
import {P3Line, P3Document} from './parser';

/**
 * Declaration provider class
 */
export class P3DefinitionProvider implements vscode.DefinitionProvider {
    provideDefinition(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): vscode.ProviderResult<vscode.Declaration> {
        return new Promise(resolve => {
            let line = document.lineAt(position.line);
            let p3Line = new P3Line(line.text, line);
            //if this is a CALL, JMP, or BR, check if the label is defined and fetch its position
            if(p3Line.jumpInstruction && p3Line.dataRange && p3Line.dataRange.contains(position)){
                let p3Document = new P3Document(document, token);
                let word = document.getText(document.getWordRangeAtPosition(position, /[^+\[,\]]([0-9a-zA-Z\-_]+)[^+\[,\]]/gi)).trim();
                let label = p3Document.p3Labels.get(word);
                if(label)
                    resolve(new vscode.Location(document.uri, label.instructionRange ? label.instructionRange.start : label.labelRange.end));
            } 
            //if we are on the data part of an instruction, check if this data (alphanumeric with - and _) is a known constant and fetch its declaration
            else if(p3Line.dataRange && p3Line.dataRange.contains(position)){
                let word = document.getText(document.getWordRangeAtPosition(position, /[^+\[,\]]([0-9a-zA-Z\-_]+)[^+\[,\]]/gi)).trim();
                let p3Document = new P3Document(document, token);
                let variable = p3Document.p3Assignments.get(word);
                if(variable)
                    resolve(new vscode.Location(document.uri, variable.valueRange.start));
            }
            resolve();
        });
    }
}