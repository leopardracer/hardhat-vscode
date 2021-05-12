import { FunctionDefinition } from "@solidity-parser/parser/dist/src/ast-types";

import { Location, FinderType, Node } from "./Node";

export class FunctionDefinitionNode implements Node {
    type: string;
    uri: string;
    astNode: FunctionDefinition;

    nameLoc?: Location | undefined;

    expressionNode?: Node | undefined;
    declarationNode?: Node | undefined;

    connectionTypeRules: string[] = [ "FunctionCall" ];

    parent?: Node | undefined;
    children: Node[] = [];

    typeNodes: Node[] = [];

    constructor (functionDefinition: FunctionDefinition, uri: string) {
        this.type = functionDefinition.type;
        this.uri = uri;
        this.astNode = functionDefinition;
        
        if (!functionDefinition.isConstructor && functionDefinition.loc && functionDefinition.name) {
            this.nameLoc = {
                start: {
                    line: functionDefinition.loc.start.line,
                    column: functionDefinition.loc.start.column + "function ".length
                },
                end: {
                    line: functionDefinition.loc.start.line,
                    column: functionDefinition.loc.start.column + "function ".length + functionDefinition.name.length
                }
            };
        }
    }

    getTypeNodes(): Node[] {
        let nodes: Node[] = [];

        this.typeNodes.forEach(typeNode => {
            nodes = nodes.concat(typeNode.getTypeNodes());
        });

        return nodes;
    }

    addTypeNode(node: Node): void {
        this.typeNodes.push(node);
    }

    getExpressionNode(): Node | undefined {
        return this.expressionNode;
    }

    setExpressionNode(node: Node | undefined): void {
        this.expressionNode = node;
    }

    getDeclarationNode(): Node | undefined {
        return this.declarationNode;
    }

    setDeclarationNode(node: Node | undefined): void {
        this.declarationNode = node;
    }

    getDefinitionNode(): Node | undefined {
        return this;
    }

    getName(): string | undefined {
        return this.astNode.name || undefined;
    }

    addChild(child: Node): void {
        this.children.push(child);
    }

    setParent(parent: Node | undefined): void {
        this.parent = parent;
    }

    getParent(): Node | undefined {
        return this.parent;
    }

    accept(find: FinderType, orphanNodes: Node[], parent?: Node, expression?: Node): Node {
        this.setExpressionNode(expression);

        if (parent) {
            this.setParent(parent);
        }

        this.findChildren(orphanNodes);

        for (const param of this.astNode.parameters) {
            find(param, this.uri).accept(find, orphanNodes, this);
        }

        if (this.astNode.returnParameters) {
            for (const returnParam of this.astNode.returnParameters) {
                const typeNode = find(returnParam, this.uri).accept(find, orphanNodes, this);

                this.addTypeNode(typeNode);
            }
        }

        if (this.astNode.body) {
            find(this.astNode.body, this.uri).accept(find, orphanNodes, this);
        }

        parent?.addChild(this);

        return this;
    }

    private findChildren(orphanNodes: Node[]): void {
        const newOrphanNodes: Node[] = [];

        let orphanNode = orphanNodes.shift();
        while (orphanNode) {
            if (
                this.getName() === orphanNode.getName() &&
                this.connectionTypeRules.includes(orphanNode.getExpressionNode()?.type || "") &&
                orphanNode.type !== "MemberAccess"
            ) {
                orphanNode.addTypeNode(this);

                orphanNode.setParent(this);
                this.addChild(orphanNode);
            } else {
                newOrphanNodes.push(orphanNode);
            }

            orphanNode = orphanNodes.shift();
        }

        for (const newOrphanNode of newOrphanNodes) {
            orphanNodes.push(newOrphanNode);
        }
    }
}
