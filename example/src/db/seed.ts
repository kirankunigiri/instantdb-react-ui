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

const seedRooms = async () => {
	const rooms = [];
	const roomNames = ['Room A', 'Room B', 'Room C', 'Room D'];

	for (const name of roomNames) {
		rooms.push(db.tx.rooms[id()]!.update({ name }));
	}

	await db.transact(rooms);
	console.log(`Created ${roomNames.length} rooms`);
};

// Seed 100 people
const seedPeople = async () => {
	const rooms = await db.query({ rooms: {} });
	const roomIds = rooms!.rooms.map(r => r.id);

	try {
		const totalPeople = 100;
		const people = [];

		for (let i = 0; i < totalPeople; i++) {
			const name = faker.person.fullName();
			people.push(
				db.tx.persons[id()]!.update({
					name,
					email: nameToEmail(name),
				}).link({ room: roomIds[i % roomIds.length] }),
			);
		}

		await db.transact(people);

		console.log(`Created ${totalPeople} people`);
	} catch (error) {
		console.log(error);
	}
};

// Delete all people
export const resetDB = async () => {
	const data = await db.query({ persons: {}, rooms: {} });
	const { persons, rooms } = data!;
	db.transact(persons.map(p => db.tx.persons[p.id]!.delete()));
	db.transact(rooms.map(r => db.tx.rooms[r.id]!.delete()));
	console.log(`Deleted ${persons.length} people and ${rooms.length} rooms`);
};

// Seed the database
await resetDB();
await seedRooms();
await seedPeople();
