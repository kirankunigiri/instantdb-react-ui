import { faker } from '@faker-js/faker';
import { id, init } from '@instantdb/admin';

import schema from '../db/instant.schema';

// --------------------------------------------------------------------------------
// InstantDB Setup
const db = init({
	appId: import.meta.env.INSTANT_APP_ID,
	schema: schema,
	adminToken: import.meta.env.INSTANT_ADMIN_TOKEN,
});

// Generate email from name
const nameToEmail = (name: string) => {
	return `${name.toLowerCase().replaceAll(' ', '.')}@fakemail.com`;
};

// Seed 100 people
export const seedPeople = async () => {
	try {
		const totalPeople = 100;
		const people = [];

		for (let i = 0; i < totalPeople; i++) {
			const name = faker.person.fullName();
			people.push(
				db.tx.persons[id()]!.update({
					name,
					email: nameToEmail(name),
				}),
			);
		}

		await db.transact(people);

		console.log(`Created ${totalPeople} people`);
	} catch (error) {
		console.log(error);
	}
};

// Delete all people
export const deleteAllPeople = async () => {
	const data = await db.query({ persons: {} });
	const { persons } = data!;
	db.transact(persons.map(p => db.tx.persons[p.id]!.delete()));
	console.log(`Deleted ${persons.length} people`);
};

// Seed the database
await deleteAllPeople();
await seedPeople();
