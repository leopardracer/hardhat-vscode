import { AST, FunctionCall } from "@solidity-parser/parser/dist/ast-types";

import { Location, Node } from "./Node";

export class FunctionCallNode implements Node {
    type: string;

    uri: string;

    name?: string | undefined;
    nameLoc?: Location | undefined;
    loc?: Location | undefined;

    parent?: Node | undefined;
    children: Node[] = [];

    constructor (functionCall: FunctionCall, uri: string) {
        this.type = functionCall.type;

        this.uri = uri;
        // TO-DO: Implement name location for rename

        // this.name = sourceUnit.name;
        // this.loc = sourceUnit.loc;
    }

    addChild(child: Node): void {
        this.children.push(child);
    }

    setParent(parent: Node): void {
        this.parent = parent;
    }

    accept(find: (ast: AST, uri: string) => Node, orphanNodes: Node[], parent?: Node): void {
        // TO-DO: Method not implemented
    }
}
