import { MemberAccess } from "@solidity-parser/parser/dist/src/ast-types";

import * as finder from "../finder";
import { Location, FinderType, Node, ContractDefinitionNode } from "./Node";

export class MemberAccessNode implements Node {
    type: string;
    uri: string;
    astNode: MemberAccess;

    nameLoc?: Location | undefined;

    expressionNode?: Node | undefined;
    declarationNode?: Node | undefined;

    connectionTypeRules: string[] = [];

    parent?: Node | undefined;
    children: Node[] = [];

    typeNodes: Node[] = [];

    constructor (memberAccess: MemberAccess, uri: string) {
        this.type = memberAccess.type;
        this.uri = uri;

        if (memberAccess.loc) {
            // Bug in solidity parser doesn't give exact locations
            memberAccess.loc.start.column = memberAccess.loc.end.column;
            memberAccess.loc.end.column = memberAccess.loc.end.column + memberAccess.memberName.length;

            this.nameLoc = JSON.parse(JSON.stringify(memberAccess.loc));
        }

        this.astNode = memberAccess;
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
        return this.parent?.getDefinitionNode();
    }

    getName(): string | undefined {
        return this.astNode.memberName;
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

        // TO-DO: Improve logic for deeper member access
        const expressionNode = find(this.astNode.expression, this.uri).accept(find, orphanNodes, parent, this);

        const definitionTypes = expressionNode.getTypeNodes();

        for (const definitionType of definitionTypes) {
            for (const definitionChild of definitionType.children) {
                if (finder.isNodeConnectable(definitionChild, this)) {
                    this.addTypeNode(definitionChild);

                    this.setParent(definitionChild);
                    definitionChild?.addChild(this);

                    return this;
                }
            }
        }

        // The Identifier name "super" is reserved, so we will try to find the parent for this Node in inheretence Nodes 
        if (expressionNode.getName() === "super" && expressionNode.type === "Identifier") {
            let contractDefinitionNode = parent;

            while (contractDefinitionNode && contractDefinitionNode.type !== "ContractDefinition") {
                contractDefinitionNode = contractDefinitionNode.getParent();
            }

            const inheritanceNodes = (contractDefinitionNode as ContractDefinitionNode).getInheritanceNodes();

            for (let i = inheritanceNodes.length - 1; i >= 0; i--) {
                const inheritanceNode = inheritanceNodes[i];

                const memberAccessParent = finder.findParent(this, inheritanceNode, true);

                if (memberAccessParent) {
                    this.addTypeNode(memberAccessParent);

                    this.setParent(memberAccessParent);
                    memberAccessParent?.addChild(this);

                    return this;
                }
            }
        }

        orphanNodes.push(this);

        return this;
    }
}
