import * as vscode from 'vscode';
import {P3HoverProvider} from './hover';
import {P3DocumentationManager} from './documentation';
import * as path from 'path';
import { P3DefinitionProvider } from './definition';

export async function activate(context: vscode.ExtensionContext) {
	state.setExtensionPath(context.extensionPath);

	await state.getDocumentationManager().then((docManager) => {
        vscode.languages.registerHoverProvider('p3', new P3HoverProvider(docManager));
        vscode.languages.registerDefinitionProvider('p3', new P3DefinitionProvider());
    });
}

export function deactivate() {}

export class ExtensionState {
    private documentationManager: P3DocumentationManager | undefined;
    private extensionPath: string = path.join(__dirname, "..");

    public getDocumentationManager(): Promise<P3DocumentationManager> {
        return new Promise(async (resolve, _reject) => {
            if (this.documentationManager === undefined) {
                this.documentationManager = new P3DocumentationManager(this.extensionPath);
                await this.documentationManager.load();
            }
            resolve(this.documentationManager);
        });
	}
	
	public setExtensionPath(extensionPath: string) {
		this.extensionPath = extensionPath;
    }
}

const state = new ExtensionState();