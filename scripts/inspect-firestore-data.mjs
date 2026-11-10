const FIREBASE_PROJECT_ID = 'gen-lang-client-0847910166';
const FIREBASE_API_KEY = 'AIzaSyC0JteZ0ph3UI1kdmu7m8DqpnGRLh9oS0g';

async function inspectCollection(col) {
  const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/${col}?key=${FIREBASE_API_KEY}`;
  const res = await fetch(url);
  const data = await res.json();
  console.log(`\n=== Collection: ${col} (HTTP ${res.status}) ===`);
  if (data.documents) {
    console.log(`Found ${data.documents.length} document(s):`);
    for (const d of data.documents) {
      const id = d.name.split('/').pop();
      console.log(`- Document ID: ${id}`);
      if (d.fields) {
        const fields = Object.fromEntries(
          Object.entries(d.fields).map(([k, v]) => [k, Object.values(v)[0]])
        );
        console.log('  Fields:', fields);
      }
    }
  } else {
    console.log('No documents found or empty collection.', data);
  }
}

async function run() {
  await inspectCollection('admin_users');
  await inspectCollection('users');
  await inspectCollection('profiles');
  await inspectCollection('registrations');
  await inspectCollection('athletes');
}

run().catch(console.error);
