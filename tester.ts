const BASE_URL = 'http://localhost:3000';

async function runTest() {
  console.log('🚀 Iniciando VIBE App Tester...\n');
  
  // Generamos un usuario aleatorio para poder correr el test múltiples veces
  const randomId = Math.floor(Math.random() * 100000);
  const testUser = {
    username: `testuser_${randomId}`,
    email: `test${randomId}@vibe.local`,
    password: 'Password123!', // Contraseña que cumple con los regex fuertes
    birthDate: '1998-05-15',
    gender: 'MALE',
    genderPreference: 'EVERYONE',
    vibeColor: 'hsl(200, 100%, 50%)'
  };

  // --- PASO 1: REGISTRO ---
  console.log('📝 1. Registrando usuario nuevo...');
  const regRes = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(testUser)
  });
  const regData = await regRes.json();
  console.log('-> Respuesta Registro:', regData);

  if (!regData.success) {
    console.error('❌ Falló el registro. Abortando test.');
    return;
  }

  // --- PASO 2: LOGIN ---
  console.log('\n🔑 2. Iniciando sesión con las credenciales registradas...');
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: testUser.email, password: testUser.password })
  });
  const loginData = await loginRes.json();
  console.log('-> Respuesta Login:', loginData);

  if (!loginData.success) {
    console.error('❌ Falló el login. Abortando test.');
    return;
  }

  const token = loginData.token;

  // --- PASO 3: ENTRAR A LA APP (Cargando Dashboard Completo) ---
  console.log('\n📱 3. Entrando a la App (Cargando Dashboard Comercial)...');
  
  const headers = { 
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}` 
  };

  // 3.1 Fetch Feed
  const feedRes = await fetch(`${BASE_URL}/api/live-feed`, { method: 'GET', headers });
  const feedData = await feedRes.json();
  
  // 3.2 Fetch Matches
  const matchesRes = await fetch(`${BASE_URL}/api/matches`, { method: 'GET', headers });
  const matchesData = await matchesRes.json();

  // 3.3 Fetch Radar Parties
  const partiesRes = await fetch(`${BASE_URL}/api/parties/radar`, { method: 'GET', headers });
  const partiesData = await partiesRes.json();

  // 3.4 Fetch Stories
  const storiesRes = await fetch(`${BASE_URL}/api/stories`, { method: 'GET', headers });
  const storiesData = await storiesRes.json();

  if (feedData.success && matchesData.success && partiesData.success && storiesData.success) {
     console.log('\n🔥 --- VIBE DASHBOARD CARGADO EXITOSAMENTE --- 🔥');
     console.log(`\n📰 Live Feed (${feedData.feed.length} items)`);
     console.log(`   Ejemplo: ${feedData.feed[0].text} [Img: ${feedData.feed[0].image}]`);
     
     console.log(`\n💘 Tus Matches (${matchesData.matches.length} perfiles)`);
     console.log(`   Conectaste con: ${matchesData.matches[0].name} (${matchesData.matches[0].synergy}% sinergia)`);
     console.log(`   Bio: "${matchesData.matches[0].bio}"`);
     
     console.log(`\n📍 Radar de Fiestas (${partiesData.parties.length} eventos cerca)`);
     console.log(`   Evento Destacado: ${partiesData.parties[0].name}`);
     console.log(`   Ambiente: ${partiesData.parties[0].vibe} | Precio: ${partiesData.parties[0].price}`);
     
     console.log(`\n📸 Historias en Vivo (${storiesData.stories.length} activas)`);
     console.log(`   Viendo: ${storiesData.stories[0].title} (En vivo: ${storiesData.stories[0].isLive})`);

     console.log('\n✅ TEST COMPLETADO CON ÉXITO: Tu Backend está listo para ser consumido por una App espectacular.');
  } else {
     console.error('\n❌ Falló la carga del Dashboard Comercial.');
  }
}

runTest();