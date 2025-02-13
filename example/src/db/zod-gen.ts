/**
 * NOTE: This file is deprecated. The original plan was to use code generation to create zod schemas, but the
 * new approach is to directly inject zod schemas into the instantdb schema. This file is kept for reference.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';

interface EntityDefinition {
	fields: Record<string, { type: string, unique?: boolean, indexed?: boolean, zodValidation?: string }>
}

interface RelationDefinition {
	reverse: {
		on: string
		has: 'one' | 'many'
		label: string
	}
	forward: {
		on: string
		has: 'one' | 'many'
		label: string
	}
}

function extractEntities(sourceFile: ts.SourceFile): Record<string, EntityDefinition> {
	const entities: Record<string, EntityDefinition> = {};

	function extractZodTransform(node: ts.CallExpression): string | undefined {
		let current = node;
		while (ts.isCallExpression(current)) {
			if (ts.isPropertyAccessExpression(current.expression)) {
				const methodName = current.expression.name.text;
				if (methodName === 'withZod' && current.arguments[0]) {
					// Extract the Zod validation chain from the arrow function
					const arrowFunc = current.arguments[0];
					if (ts.isArrowFunction(arrowFunc) && arrowFunc.body) {
						return arrowFunc.body.getText();
					}
				}
			}
			current = current.expression as ts.CallExpression;
		}
		return undefined;
	}

	function visit(node: ts.Node) {
		if (ts.isCallExpression(node)
		  && ts.isPropertyAccessExpression(node.expression)
		  && node.expression.name.text === 'entity') {
			const entityArg = node.arguments[0];
			if (ts.isObjectLiteralExpression(entityArg)) {
				const fields: Record<string, { type: string, unique?: boolean, indexed?: boolean, zodValidation?: string }> = {};

				entityArg.properties.forEach((prop) => {
					if (ts.isPropertyAssignment(prop) && ts.isIdentifier(prop.name)) {
						const fieldName = prop.name.text;
						const fieldValue = prop.initializer;

						if (ts.isCallExpression(fieldValue)) {
							let type = '';
							let unique = false;
							let indexed = false;
							let zodValidation: string | undefined;

							// Extract type
							if (ts.isPropertyAccessExpression(fieldValue.expression)) {
								const methodName = fieldValue.expression.name.text;
								switch (methodName) {
									case 'string':
										type = 'string';
										break;
									case 'number':
										type = 'number';
										break;
									case 'date':
										type = 'date';
										break;
									case 'any':
										type = 'any';
										break;
									default:
										type = 'unknown';
								}
							}

							// Extract modifiers and Zod validation
							zodValidation = extractZodTransform(fieldValue);

							let current = fieldValue;
							while (ts.isCallExpression(current)) {
								if (ts.isPropertyAccessExpression(current.expression)) {
									const modifier = current.expression.name.text;
									if (modifier === 'unique') unique = true;
									if (modifier === 'indexed') indexed = true;
								}
								current = current.expression as ts.CallExpression;
							}

							fields[fieldName] = { type, unique, indexed, zodValidation };
						}
					}
				});

				// Find the parent object's property name (entity name)
				if (node.parent && ts.isPropertyAssignment(node.parent)) {
					const entityName = (node.parent.name as ts.Identifier).text;
					entities[entityName] = { fields };
				}
			}
		}
		ts.forEachChild(node, visit);
	}

	visit(sourceFile);
	return entities;
}

function extractRelations(sourceFile: ts.SourceFile): Record<string, RelationDefinition> {
	const relations: Record<string, RelationDefinition> = {};

	function visit(node: ts.Node) {
		if (ts.isObjectLiteralExpression(node)
		  && node.parent
		  && ts.isCallExpression(node.parent)
		  && node.parent.arguments.length === 2) {
			node.properties.forEach((prop) => {
				if (ts.isPropertyAssignment(prop)
				  && ts.isIdentifier(prop.name)
				  && ts.isObjectLiteralExpression(prop.initializer)) {
					const relationName = prop.name.text;
					const relationDef: any = {};

					prop.initializer.properties.forEach((relProp) => {
						if (ts.isPropertyAssignment(relProp)
						  && ts.isIdentifier(relProp.name)
						  && ts.isObjectLiteralExpression(relProp.initializer)) {
							const direction = relProp.name.text;
							relationDef[direction] = {};

							relProp.initializer.properties.forEach((dirProp) => {
								if (ts.isPropertyAssignment(dirProp) && ts.isIdentifier(dirProp.name)) {
									const key = dirProp.name.text;
									const value = (dirProp.initializer as any).text;
									relationDef[direction][key] = value;
								}
							});
						}
					});

					relations[relationName] = relationDef;
				}
			});
		}
		ts.forEachChild(node, visit);
	}

	visit(sourceFile);
	return relations;
}

function generateZodSchemas(
	entities: Record<string, EntityDefinition>,
	relations: Record<string, RelationDefinition>,
): string {
	let output = `import { z } from 'zod';\n\n`;

	// Generate base schemas for each entity
	Object.entries(entities).forEach(([entityName, entity]) => {
		const normalizedName = entityName.startsWith('$') ? entityName.slice(1) : entityName;
		output += `export const ${normalizedName}Schema = z.object({\n`;
		output += `  id: z.string(),\n`;

		// Add fields
		Object.entries(entity.fields).forEach(([fieldName, field]) => {
			if (field.zodValidation) {
				output += `  ${fieldName}: ${field.zodValidation},\n`;
			} else {
				let zodType = 'z.string()';
				switch (field.type) {
					case 'number':
						zodType = 'z.number()';
						break;
					case 'date':
						zodType = 'z.date()';
						break;
					case 'any':
						zodType = 'z.any()';
						break;
				}
				output += `  ${fieldName}: ${zodType},\n`;
			}
		});

		// Add relation fields
		Object.entries(relations).forEach(([relationName, relation]) => {
			// Forward relations
			if (relation.forward.on === entityName) {
				const targetEntity = relation.reverse.on.startsWith('$')
					? relation.reverse.on.slice(1)
					: relation.reverse.on;

				if (relation.forward.has === 'many') {
					output += `  ${relation.forward.label}: z.array(z.object({ id: z.string() })).optional(),\n`;
				} else {
					output += `  ${relation.forward.label}Id: z.string().optional(),\n`;
				}
			}

			// Reverse relations
			if (relation.reverse.on === entityName || relation.reverse.on === `$${entityName}`) {
				const targetEntity = relation.forward.on.startsWith('$')
					? relation.forward.on.slice(1)
					: relation.forward.on;

				if (relation.reverse.has === 'many') {
					output += `  ${relation.reverse.label}: z.array(z.object({ id: z.string() })).optional(),\n`;
				} else {
					output += `  ${relation.reverse.label}Id: z.string().optional(),\n`;
				}
			}
		});

		output += `});\n\n`;
	});

	return output;
}

export function generateZodSchemasFromFile(inputPath: string): void {
	const sourceFile = ts.createSourceFile(
		inputPath,
		fs.readFileSync(inputPath, 'utf8'),
		ts.ScriptTarget.Latest,
		true,
	);

	const entities = extractEntities(sourceFile);
	const relations = extractRelations(sourceFile);

	const outputPath = path.join(path.dirname(inputPath), 'instant.zod.ts');
	const generatedCode = generateZodSchemas(entities, relations);

	fs.writeFileSync(outputPath, generatedCode);
}

// Example usage
generateZodSchemasFromFile('./example/src/db/instant.schema.ts');
