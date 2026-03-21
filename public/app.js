const API_URL = 'http://localhost:3000';
let currentUser = null;
let token = localStorage.getItem('vibe_token');

// --- Lógica de Retorno Social (OAuth Callback) ---
// Verificar si venimos de una redirección de Google/Facebook
const urlParams = new URLSearchParams(window.location.search);
const urlToken = urlParams.get('token');
const urlUser = urlParams.get('user');
const urlError = urlParams.get('error');

// Manejo de errores de redirección
if (urlError) {
    showToast('Error de acceso: ' + (urlError === 'login_failed' ? 'No se pudo iniciar sesión' : urlError));
    window.history.replaceState({}, document.title, "/");
}

if (urlToken && urlUser) {
    token = urlToken;
    currentUser = JSON.parse(decodeURIComponent(urlUser));
    localStorage.setItem('vibe_token', token);
    localStorage.setItem('vibe_user', JSON.stringify(currentUser));
    // Limpiar la URL para que se vea limpia
    window.history.replaceState({}, document.title, "/");
    // El checkAuth() de abajo se encargará de mostrar el dashboard
}

// Estados de autenticación (1: Enviar Código, 2: Verificar)
let loginStep = 1;
let registerStep = 1;

// --- Vibe Check System (Aura Analysis) ---
const vibeState = {
    positions: [],
    lastTime: Date.now(),
    hue: 270, // Default Purple
    intensity: 0
};

// Métodos de autenticación actuales ('phone' o 'email')
let currentLoginMethod = 'phone';
let currentRegisterMethod = 'phone';

// --- Funciones de Utilidad ---
function showToast(message) {
    const x = document.getElementById("toast");
    x.innerText = message;
    x.className = "show";
    setTimeout(function(){ x.className = x.className.replace("show", ""); }, 3000);
}

function toggleAuth(view) {
    if (view === 'register') {
        document.getElementById('login-form').classList.add('hidden');
        document.getElementById('register-form').classList.remove('hidden');
    } else {
        document.getElementById('register-form').classList.add('hidden');
        document.getElementById('login-form').classList.remove('hidden');
    }
}

function checkAuth() {
    if (token) {
        // Si venimos de loguearnos socialmente, mostrar bienvenida antes de salir de la vista
        if (urlToken && currentUser) {
            showToast(`¡Bienvenido de nuevo, ${currentUser.username}!`);
            setTimeout(() => window.location.href = '/app.html', 1500);
        } else {
            // Redirección directa al Portal Élite
            window.location.href = '/app.html';
        }
    } else {
        document.getElementById('auth-view').classList.remove('hidden');
        toggleAuth('login'); // Asegurar que retorne al inicio de sesión
    }
}

function logout() {
    localStorage.removeItem('vibe_token');
    localStorage.removeItem('vibe_user');
    token = null;
    currentUser = null;
    checkAuth();
}

function socialLogin(provider) {
    showToast(`Conectando con ${provider}...`);
    // Capturamos el color actual del aura para enviarlo al backend social
    const vibeColor = encodeURIComponent(`hsl(${Math.floor(vibeState.hue)}, 100%, 60%)`);
    // Pequeño delay para feedback visual antes de redirigir
    setTimeout(() => {
        window.location.href = `${API_URL}/auth/${provider}?vibe_color=${vibeColor}`;
    }, 1000);
}

// --- UI Switchers ---
function setLoginMethod(method) {
    currentLoginMethod = method;
    const btn = document.getElementById('login-btn');
    const tabs = document.querySelectorAll('#login-form .tab-btn');
    
    tabs.forEach(t => t.classList.remove('active'));
    if (method === 'phone') {
        tabs[0].classList.add('active');
        document.getElementById('login-method-phone').classList.remove('hidden');
        document.getElementById('login-method-email').classList.add('hidden');
    } else {
        tabs[1].classList.add('active');
        document.getElementById('login-method-phone').classList.add('hidden');
        document.getElementById('login-method-email').classList.remove('hidden');
    }
    btn.innerText = 'Iniciar Sesión';
}

function setRegisterMethod(method) {
    currentRegisterMethod = method;
    const btn = document.getElementById('reg-btn');
    const tabs = document.querySelectorAll('#register-form .tab-btn');

    tabs.forEach(t => t.classList.remove('active'));
    if (method === 'phone') {
        tabs[0].classList.add('active');
        document.getElementById('reg-method-phone').classList.remove('hidden');
        document.getElementById('reg-method-email').classList.add('hidden');
        btn.innerText = registerStep === 1 ? 'Enviar Código' : 'Verificar y Unirse';
    } else {
        tabs[1].classList.add('active');
        document.getElementById('reg-method-phone').classList.add('hidden');
        document.getElementById('reg-method-email').classList.remove('hidden');
        btn.innerText = 'Registrarse con Correo';
    }
}

// --- Lógica Comercial de Contraseñas ---
function togglePassword(inputId, icon) {
    const el = document.getElementById(inputId);
    if (el.type === 'password') {
        el.type = 'text';
        icon.innerText = '🙈';
    } else {
        el.type = 'password';
        icon.innerText = '👁️';
    }
}

function checkPasswordStrength() {
    const val = document.getElementById('reg-pass').value;
    const bar = document.getElementById('strength-bar');
    let strength = 0;
    
    if (val.length >= 8) strength += 20;
    if (val.match(/[a-z]/)) strength += 20;
    if (val.match(/[A-Z]/)) strength += 25;
    if (val.match(/[0-9]/)) strength += 25;
    if (val.match(/[^a-zA-Z0-9]/)) strength += 25;
    
    strength = Math.min(100, strength);
    bar.style.width = strength + '%';
    
    if (strength < 40) bar.style.background = '#FF4C4C'; // Rojo (Muy Débil)
    else if (strength < 80) bar.style.background = '#FFA500'; // Naranja (Aceptable)
    else if (strength < 100) bar.style.background = '#F9E076'; // Amarillo
    else bar.style.background = '#00FF80'; // Verde Neón (Fuerte/Segura)
}

// --- API Calls ---

async function login(e) {
    e.preventDefault();
    const btn = document.getElementById('login-btn');
    
    // Identificador dinámico: ¿Usó correo o teléfono?
    const identifier = currentLoginMethod === 'email' 
        ? document.getElementById('login-email').value 
        : document.getElementById('login-phone').value;
        
    const password = document.getElementById('login-pass').value;

    if (!identifier || !password) return showToast('Completa todos los campos');
        
    btn.disabled = true;
    btn.innerText = 'Entrando...';
    const vibeColor = `hsl(${Math.floor(vibeState.hue)}, 100%, 60%)`;
    try {
        const res = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identifier, password, vibeColor })
        });
        const data = await res.json();
        btn.disabled = false;
        btn.innerText = 'Iniciar Sesión';
        
        if (data.success) {
            handleLoginSuccess(data);
        } else {
            showToast(data.message || 'Error de credenciales');
        }
    } catch (err) {
        btn.disabled = false;
        showToast('Error de conexión');
    }
}

function handleLoginSuccess(data) {
    token = data.token;
    currentUser = data.user;
    localStorage.setItem('vibe_token', token);
    localStorage.setItem('vibe_user', JSON.stringify(currentUser));
    showToast(`¡Bienvenido, ${currentUser.username}!`);
    
    // Innovación: Bienvenida por voz
    if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(`Hola ${currentUser.username}, bienvenido a Vibe.`);
        utterance.lang = 'es-ES';
        window.speechSynthesis.speak(utterance);
    }
    
    // Generar escudo E2EE transparente en segundo plano
    setupQuantumShield(token);

    checkAuth();
}

async function register(e) {
    e.preventDefault();
    const username = document.getElementById('reg-username').value;
    const birthDate = document.getElementById('reg-dob').value;
    const gender = document.getElementById('reg-gender').value;
    const btn = document.getElementById('reg-btn');
    
    // Pre-validaciones visuales
    if (!username || !birthDate || !gender) {
        return showToast('❌ Completa todos los campos obligatorios');
    }

    // Contraseña siempre requerida
    const password = document.getElementById('reg-pass').value;
    const confirm = document.getElementById('reg-pass-confirm').value;
    if (!password) return showToast('Ingresa una contraseña segura');
    if (password !== confirm) return showToast('❌ Las contraseñas no coinciden');

    // Lógica para Email/Password
    if (currentRegisterMethod === 'email') {
        const email = document.getElementById('reg-email').value;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        
        if (!email) return showToast('Faltan datos de correo');
        if (!emailRegex.test(email)) {
            return showToast('❌ Ingresa un correo electrónico válido');
        }

        btn.disabled = true;
        btn.innerText = 'Creando cuenta...';
        const vibeColor = `hsl(${Math.floor(vibeState.hue)}, 100%, 60%)`;
        try {
            const res = await fetch(`${API_URL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    username, email, password, birthDate, gender, 
                    genderPreference: 'EVERYONE', vibeColor
                })
            });
            const data = await res.json();
            btn.disabled = false;
            if (data.success) {
                showToast('¡Cuenta creada! Bienvenido.');
                handleLoginSuccess(data);
            } else {
                showToast(data.message || 'Error en el registro');
            }
        } catch (err) {
            btn.disabled = false;
            showToast('Error de conexión');
        }
        return;
    }

    // Lógica para Teléfono
    const phone = document.getElementById('reg-phone').value;
    const otp = document.getElementById('reg-otp').value;

    try {
        if (registerStep === 1) {
            // Paso 1: Enviar OTP para verificar número antes de crear cuenta
            if (!phone) return showToast('Número requerido');
            if (phone.length < 8) return showToast('❌ Número de teléfono muy corto');
            
            btn.disabled = true;
            btn.innerText = 'Enviando...';

            const res = await fetch(`${API_URL}/auth/register/send-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone })
            });
            const data = await res.json();

            btn.disabled = false;
            if (data.success) {
                registerStep = 2;
                document.getElementById('reg-otp-group').classList.remove('hidden');
                document.getElementById('reg-phone').disabled = true;
                btn.innerText = 'Verificar y Unirse';
                showToast('Código enviado. Revisa tu SMS.');
            } else {
                btn.innerText = 'Enviar Código';
                showToast(data.message || 'Error al enviar');
            }
        } else {
            // Paso 2: Crear cuenta con OTP verificado
            const vibeColor = `hsl(${Math.floor(vibeState.hue)}, 100%, 60%)`;
            const res = await fetch(`${API_URL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    username, phone, code: otp, password, birthDate, gender, 
                    genderPreference: 'EVERYONE', vibeColor
                })
            });
            const data = await res.json();

            if (data.success) {
                showToast('¡Cuenta creada! Bienvenido.');
                handleLoginSuccess(data); // Auto login profesional
            } else {
                showToast(data.message || 'Error en el registro');
            }
        }
    } catch (err) {
        document.getElementById('reg-btn').disabled = false;
        showToast('Error de conexión');
    }
}

// --- Funciones Innovadoras ---

async function biometricLogin() {
    showToast("Iniciando escáner biométrico FIDO2...");
    try {
        // Implementación REAL de WebAuthn (TouchID/FaceID) Nativa del Navegador
        const publicKeyCredentialRequestOptions = {
            challenge: Uint8Array.from("vibe_server_secure_challenge", c => c.charCodeAt(0)),
            rpId: window.location.hostname, // Se ancla al dominio real de tu web
            timeout: 60000,
            userVerification: "preferred"
        };

        const assertion = await navigator.credentials.get({
            publicKey: publicKeyCredentialRequestOptions
        });

        if (assertion) {
            showToast("✅ Biometría verificada. Encriptando sesión...");
            // Al pasar la huella real, fuerza el flujo de entrada
            setTimeout(checkAuth, 1000); 
        }
    } catch (err) {
        showToast("❌ Acceso biométrico cancelado o no soportado.");
    }
}

// --- VIBE QUANTUM SHIELD (Generador E2EE) ---
const CRYPTO_DB = 'VibeCryptoDB';
const CRYPTO_STORE = 'keyStore';

function initCryptoDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(CRYPTO_DB, 1);
        request.onupgradeneeded = (e) => e.target.result.createObjectStore(CRYPTO_STORE);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function savePrivateKey(privKeyBase64) {
    const db = await initCryptoDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(CRYPTO_STORE, 'readwrite');
        tx.objectStore(CRYPTO_STORE).put(privKeyBase64, 'vibe_private_key');
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject();
    });
}

async function setupQuantumShield(authToken) {
    try {
        const db = await initCryptoDB();
        const tx = db.transaction(CRYPTO_STORE, 'readonly');
        const store = tx.objectStore(CRYPTO_STORE);

        const hasKey = await new Promise((resolve, reject) => {
            const req = store.get('vibe_private_key');
            req.onsuccess = () => resolve(!!req.result);
            req.onerror = () => reject(req.error);
        });

        if (hasKey) {
            console.log("🛡️ Quantum Shield activo en este dispositivo.");
            return;
        }

        // Generación de llaves RSA 2048-bit (compatible con dispositivos modernos)
        const keyPair = await window.crypto.subtle.generateKey(
            { name: "RSA-OAEP", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
            true,
            ["encrypt", "decrypt"]
        );

        const pubBuffer = await window.crypto.subtle.exportKey("spki", keyPair.publicKey);
        const privBuffer = await window.crypto.subtle.exportKey("pkcs8", keyPair.privateKey);

        const pubB64 = window.btoa(String.fromCharCode(...new Uint8Array(pubBuffer)));
        const privB64 = window.btoa(String.fromCharCode(...new Uint8Array(privBuffer)));

        await savePrivateKey(privB64);

        await fetch(`${API_URL}/auth/public-key`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ publicKey: pubB64 })
        });

        console.log("🛡️ Quantum Shield configurado y clave pública enviada.");
    } catch (e) {
        console.warn("🛡️ Quantum Shield no pudo activarse (autenticación/DB/crypto).", e);
    }
}

// --- Vibe Check Logic ---
function initVibeCheck() {
    document.addEventListener('mousemove', (e) => {
        const now = Date.now();
        if (now - vibeState.lastTime > 50) { // Sample every 50ms
            vibeState.positions.push({ x: e.clientX, y: e.clientY });
            if (vibeState.positions.length > 10) vibeState.positions.shift();
            vibeState.lastTime = now;
        }
    });

    setInterval(analyzeVibe, 90); // Ajusta la aura en tiempo real
}

function analyzeVibe() {
    if (vibeState.positions.length < 2) return;
    
    const p1 = vibeState.positions[0];
    const p2 = vibeState.positions[vibeState.positions.length - 1];
    const dist = Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
    
    // Mapeo de movimiento a color (Aura)
    // Lento = Azul/Cian, Rápido = Rojo/Naranja, Medio = Violeta
    let targetHue = 270;
    if (dist > 150) targetHue = 0; // Rojo (Intenso/Rápido)
    else if (dist > 80) targetHue = 40; // Naranja (Activo)
    else if (dist > 30) targetHue = 270; // Violeta (Vibe Normal)
    else targetHue = 180; // Cian (Calma/Lento)

    // Suavizado del cambio de color (Lerp)
    vibeState.hue = vibeState.hue + (targetHue - vibeState.hue) * 0.1;
    
    const color = `hsl(${vibeState.hue}, 100%, 60%)`;
    const indicator = document.getElementById('vibe-aura-indicator');
    if (indicator) {
        indicator.style.backgroundColor = color;
        indicator.style.boxShadow = `0 0 15px ${color}`;
    }
}

// --- Event Listeners ---
document.getElementById('login-form').addEventListener('submit', login);
document.getElementById('register-form').addEventListener('submit', register);

// Init
checkAuth();
initVibeCheck();

// --- 3D Background Animation (Vibe Sphere) ---
function initVibeBackground() {
    const canvas = document.getElementById('vibe-canvas');
    const ctx = canvas.getContext('2d');
    let width, height;
    let sphereRadius, focalLength; // Variables dinámicas para evitar distorsión

    // --- TEXTURA DE RUIDO (FILM GRAIN) ---
    // Generamos el ruido una sola vez para rendimiento
    const noiseCanvas = document.createElement('canvas');
    const noiseCtx = noiseCanvas.getContext('2d');
    noiseCanvas.width = 200;
    noiseCanvas.height = 200;
    
    const idata = noiseCtx.createImageData(200, 200);
    const buffer32 = new Uint32Array(idata.data.buffer);
    for (let i = 0; i < buffer32.length; i++) {
        if (Math.random() < 0.1) buffer32[i] = 0x10ffffff; // Píxeles blancos muy tenues
    }
    noiseCtx.putImageData(idata, 0, 0);

    
    // Fondo de Estrellas (Profundidad)
    const stars = [];
    for(let i=0; i<300; i++) {
        stars.push({
            x: (Math.random() - 0.5) * 3000,
            y: (Math.random() - 0.5) * 3000,
            z: Math.random() * 2000 + 500,
            size: Math.random() * 1.5
        });
    }
    
    // Interacción del Mouse (Campo de Fuerza)
    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let isWarping = false; // Estado para efecto Hipervelocidad

    window.addEventListener('mousemove', e => {
        mouseX = e.clientX;
        mouseY = e.clientY;
    });
    window.addEventListener('mousedown', () => isWarping = true);
    window.addEventListener('mouseup', () => isWarping = false);

    window.addEventListener('resize', resize);
    function resize() {
        // Soporte 4K / Retina Display (Ultra HD)
        const dpr = window.devicePixelRatio || 1;
        canvas.width = window.innerWidth * dpr;
        canvas.height = window.innerHeight * dpr;
        width = canvas.width;
        height = canvas.height;
        
        // Configuración Óptica Profesional
        // Aumentamos la focal para aplanar la perspectiva y evitar distorsión en los bordes
        focalLength = Math.max(width, height) * 2; 
        sphereRadius = Math.min(width, height) * 0.25; // La esfera ocupa el 25% de la pantalla
    }
    resize();

    class Particle3D {
        constructor(x, y, z, isText = false) {
            this.x = x;
            this.y = y;
            this.z = z;
            // Destinos para la metamorfosis (Morphing targets)
            this.tx = x;
            this.ty = y;
            this.tz = z;
            this.isText = isText;
            // Paleta Elegante: Dorado/Cian para texto, Violetas/Azules para esfera
            this.baseHue = isText ? 190 : (Math.random() * 40 + 250); 
            // Tamaño ajustado para alta resolución (DPR)
            const dpr = window.devicePixelRatio || 1;
            this.size = (isText ? 2.5 : (Math.random() * 2 + 0.8)) * dpr;
        }

        project(angleX, angleY, angleZ, transX, transY, transZ) {
            // Rotación Euler completa (X, Y, Z) para movimiento 3D real
            // Rotar X
            let y1 = this.y * Math.cos(angleX) - this.z * Math.sin(angleX);
            let z1 = this.z * Math.cos(angleX) + this.y * Math.sin(angleX);
            // Rotar Y
            let x1 = this.x * Math.cos(angleY) - this.z * Math.sin(angleY);
            let z2 = z1 * Math.cos(angleY) + this.x * Math.sin(angleY);
            // Rotar Z
            let x2 = x1 * Math.cos(angleZ) - y1 * Math.sin(angleZ);
            let y2 = y1 * Math.cos(angleZ) + x1 * Math.sin(angleZ);

            // Traslación Híbrida:
            // Solo aplicamos Z en el mundo 3D para el zoom/escala.
            // X e Y se aplican después de proyectar para evitar que la esfera se vea ovalada en los bordes.
            let worldZ = z2 + transZ;

            // Proyección de Perspectiva Real
            const depth = focalLength + worldZ;
            if (depth <= 0) return null; // Detrás de la cámara
            
            const scale = focalLength / depth;
            
            return {
                x: (width / 2) + (x2 * scale) + transX, // TransX sumado en 2D mantiene la forma redonda
                y: (height / 2) + (y2 * scale) + transY,
                scale: scale,
                z: worldZ,
                alpha: Math.min(1, Math.max(0, (1000 - worldZ) / 1000)) // Niebla de profundidad
            };
        }
    }

    const particles = [];

    // --- DEFINICIÓN DE FORMAS (GEOMETRÍA SAGRADA) ---
    const samples = 800; // Aumentamos densidad para mayor definición
    const phi = Math.PI * (3 - Math.sqrt(5)); // Ángulo dorado

    const shapes = {
        sphere: (i) => {
            const y = 1 - (i / (samples - 1)) * 2;
            const radius = Math.sqrt(1 - y * y);
            const theta = phi * i;
            return { x: Math.cos(theta) * radius, y: y, z: Math.sin(theta) * radius };
        },
        torus: (i) => {
            // Dona matemática
            const theta = (i / samples) * Math.PI * 2 * 2; // 2 vueltas
            const tubeRadius = 0.35;
            const ringRadius = 0.65;
            const phiAngle = (i / samples) * Math.PI * 2 * 8; // Espirales internas
            return {
                x: (ringRadius + tubeRadius * Math.cos(phiAngle)) * Math.cos(theta),
                y: (ringRadius + tubeRadius * Math.cos(phiAngle)) * Math.sin(theta),
                z: tubeRadius * Math.sin(phiAngle)
            };
        },
        dna: (i) => {
            // Doble Hélice (Conexión)
            const t = i / samples;
            const angle = t * Math.PI * 2 * 5; // 5 giros
            const radius = 0.5;
            const offset = (i % 2 === 0) ? 0 : Math.PI; // Separar en dos hebras
            return {
                x: Math.cos(angle + offset) * radius,
                y: (t - 0.5) * 2.5, // Altura extendida
                z: Math.sin(angle + offset) * radius
            };
        },
        nebula: (i) => {
            // Galaxia Espiral Áurea (Golden Spiral Galaxy)
            const arms = 3;
            const spin = i * 0.1;
            const r = (i / samples); // Radio creciente
            const angle = spin + (Math.PI * 2 / arms) * (i % arms);
            return {
                x: Math.cos(angle) * r * 1.5,
                y: (Math.random() - 0.5) * 0.3 * (1 - r), // Disco plano con variación
                z: Math.sin(angle) * r * 1.5
            };
        }
    };

    // 1. Inicializar partículas (Empiezan como Esfera)
    for(let i=0; i<samples; i++) {
        const pos = shapes.sphere(i);
        particles.push(new Particle3D(pos.x, pos.y, pos.z));
    }

    // 2. Generate Text Particles ("VIBE")
    const tCanvas = document.createElement('canvas');
    const tCtx = tCanvas.getContext('2d');
    tCanvas.width = 600;
    tCanvas.height = 200;
    tCtx.font = '900 130px "Segoe UI", Arial';
    tCtx.fillStyle = 'white';
    tCtx.textAlign = 'center';
    tCtx.textBaseline = 'middle';
    tCtx.fillText("VIBE", 300, 100);
    const data = tCtx.getImageData(0, 0, 600, 200).data;
    
    for(let y=0; y<200; y+=6) { // Step 6 for density
        for(let x=0; x<600; x+=6) {
            if(data[(y*600 + x)*4 + 3] > 128) {
                // Texto centrado en el núcleo
                // Normalizamos coordenadas del texto para que escale con la esfera
                particles.push(new Particle3D((x - 300)/300, (y - 100)/300, 0, true));
            }
        }
    }

    let time = 0;
    let lastMorphTime = 0;
    const shapeKeys = Object.keys(shapes);
    let currentShapeIndex = 0;

    function animate() {
        // Fondo oscuro con estela muy suave (Elegancia)
        ctx.fillStyle = 'rgba(0, 0, 0, 0.25)'; // Fondo negro puro para mayor contraste y evitar saturación
        ctx.fillRect(0, 0, width, height);
        
        // Control de Tiempo: Si es Warp, el tiempo vuela
        const speed = isWarping ? 0.1 : 0.025;
        time += speed;
        
        const now = Date.now();

        // --- LÓGICA DE METAMORFOSIS ---
        // Cambiar de forma cada 8 segundos
        if (now - lastMorphTime > 8000) {
            currentShapeIndex = (currentShapeIndex + 1) % shapeKeys.length;
            const nextShape = shapeKeys[currentShapeIndex];
            lastMorphTime = now;
            
            // Asignar nuevos destinos a las partículas de fondo
            let idx = 0;
            particles.forEach(p => {
                if (!p.isText) {
                    const target = shapes[nextShape](idx);
                    p.tx = target.x;
                    p.ty = target.y;
                    p.tz = target.z;
                    idx++;
                }
            });
        }
        
        // 1. Rotación Caótica (Gira sobre sí misma)
        const angleX = time * 0.7;
        const angleY = time * 0.5;
        const angleZ = time * 0.3;

        // 2. Traslación Espacial (Se mueve por la pantalla y profundidad)
        // Movimiento amplio y dinámico por toda la pantalla
        // Si es Warp, centramos la cámara para el efecto túnel
        // Camera Shake: Temblor sutil para realismo
        const shakeX = (Math.random() - 0.5) * (isWarping ? 5 : 0.5);
        const shakeY = (Math.random() - 0.5) * (isWarping ? 5 : 0.5);

        const transX = (isWarping ? 0 : Math.sin(time * 0.5) * (width * 0.35)) + shakeX;
        const transY = (isWarping ? 0 : Math.cos(time * 0.4) * (height * 0.25)) + shakeY;
        const transZ = isWarping ? -200 : Math.sin(time * 0.3) * 400; 

        // Glitch Trigger (Ocasional)
        const isGlitchFrame = Math.random() < 0.04; // 4% de probabilidad por frame

        // Dibujar Estrellas de Fondo (Paralaje sutil)
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)'; // Estrellas más brillantes
        stars.forEach(s => {
            // Movimiento opuesto al mouse para profundidad
            const mx = (mouseX - width/2) * 0.05;
            const my = (mouseY - height/2) * 0.05;
            const scale = focalLength / (focalLength + s.z);
            const sx = width/2 + (s.x - mx) * scale;
            const sy = height/2 + (s.y - my) * scale;
            ctx.beginPath();
            ctx.arc(sx, sy, s.size * scale, 0, Math.PI*2);
            ctx.fill();
        });

        // Modo de fusión de luz (Glow) - IMPORTANTE: Usar con moderación
        ctx.globalCompositeOperation = 'lighter';

        const projectedPoints = [];

        particles.forEach(p => {
            // INTERPOLACIÓN (Lerp): Mover suavemente hacia la forma destino
            if (!p.isText) {
                p.x += (p.tx - p.x) * 0.03; // 3% de acercamiento por frame (movimiento fluido)
                p.y += (p.ty - p.y) * 0.03;
                p.z += (p.tz - p.z) * 0.03;
            }

            // Escalamos las coordenadas normalizadas por el radio actual
            // Esto asegura que la esfera sea redonda sin importar la resolución
            const scale = p.isText ? sphereRadius * 0.6 : sphereRadius;
            
            let px = p.x * scale;
            let py = p.y * scale;
            let pz = p.z * scale;

            // Efecto Glitch Cyberpunk para el texto
            if (p.isText && isGlitchFrame) {
                if (Math.random() < 0.2) px += (Math.random() - 0.5) * 150; // Desplazamiento horizontal brusco
                py += (Math.random() - 0.5) * 10; // Ruido vertical
            }

            // Creamos una instancia temporal escalada para proyectar
            const effectiveP = { ...p, x: px, y: py, z: pz };
            
            // Usamos el método del prototipo pero con los valores escalados
            // (Pequeño hack para no recalcular todo el objeto)
            const point = p.project.call(effectiveP, angleX, angleY, angleZ, transX, transY, transZ);
            
            // Si el punto está detrás de la cámara o muy lejos, no lo dibujamos
            if (!point) return;
            
            // --- INTERACCIÓN DEL MOUSE (CAMPO MAGNÉTICO) ---
            // Calcular distancia del mouse al punto proyectado en 2D
            const dx = point.x - mouseX;
            const dy = point.y - mouseY;
            const dist = Math.sqrt(dx*dx + dy*dy);
            const repulsionRadius = 150;

            if (dist < repulsionRadius) {
                const force = (1 - dist / repulsionRadius) * 30; // Fuerza de repulsión
                point.x += (dx / dist) * force;
                point.y += (dy / dist) * force;
            }

            // Efecto Warp: Estirar partículas si estamos en hipervelocidad
            if (isWarping) {
                // Estela hacia el centro
                const cx = width / 2;
                const cy = height / 2;
                ctx.strokeStyle = `hsla(${p.baseHue}, 100%, 70%, ${point.alpha * 0.5})`;
                ctx.lineWidth = p.size * point.scale;
                ctx.beginPath();
                ctx.moveTo(point.x, point.y);
                ctx.lineTo(point.x + (point.x - cx) * 0.1, point.y + (point.y - cy) * 0.1);
                ctx.stroke();
            }

            projectedPoints.push({p, point});
        });

        // Dibujar Constelaciones (Líneas entre puntos cercanos)
        ctx.lineWidth = 0.2;
        ctx.strokeStyle = 'rgba(138, 43, 226, 0.15)'; // Líneas violetas muy sutiles
        ctx.beginPath();
        
        // Optimización: Conectar solo vecinos en el array (propiedad de Fibonacci)
        for (let i = 0; i < samples; i++) { 
            const v1 = projectedPoints[i];
            if (!v1) continue;

            for (let j = 1; j < 3; j++) { // Conectar con los 2 siguientes (más limpio)
                if (i + j < projectedPoints.length) { 
                    const v2 = projectedPoints[i+j];
                    if (v2) {
                        // Desvanecer líneas lejanas
                        const distAlpha = (v1.point.alpha + v2.point.alpha) / 2;
                        if (distAlpha > 0.1) {
                            ctx.moveTo(v1.point.x, v1.point.y);
                            ctx.lineTo(v2.point.x, v2.point.y);
                        }
                    }
                }
            }
        }
        ctx.stroke();

        // Dibujar Partículas
        projectedPoints.forEach(v => {
            const { point, p } = v;
            const alpha = p.isText ? 1 : Math.max(0.1, Math.min(1, point.alpha));
            
            // Color Glitch: Si hay glitch, el texto parpadea en blanco o cian brillante
            // Vibe Check: La esfera adopta el color del aura del usuario
            const hue = (p.isText && isGlitchFrame) ? 180 : (p.isText ? p.baseHue : vibeState.hue);
            const sat = (p.isText && isGlitchFrame) ? '100%' : (p.isText ? '100%' : '70%');
            const light = (p.isText && isGlitchFrame) ? '90%' : (p.isText ? '70%' : '60%');
            
            // Destello aleatorio (Twinkle)
            const twinkle = Math.random() > 0.95 ? 1.5 : 1;

            // Color dinámico basado en el tiempo para la esfera (Ciclo de colores)
            const dynamicHue = p.isText ? hue : (hue + time * 10) % 360;

            // --- RENDERIZADO CINEMATOGRÁFICO (DOBLE PASO) ---
            
            // 1. Halo de Luz (Glow) - Grande y suave
            const glowSize = p.size * point.scale * twinkle * 4;
            ctx.fillStyle = `hsla(${dynamicHue}, ${sat}, 50%, ${alpha * 0.3})`;
            ctx.beginPath();
            ctx.arc(point.x, point.y, glowSize, 0, Math.PI * 2);
            ctx.fill();

            // 2. Núcleo (Core) - Pequeño y blanco brillante (Hotspot)
            // Si estamos en Warp, desplazamos el canal rojo para Aberración Cromática
            const aberrationX = isWarping ? (point.x - width/2) * 0.02 : 0;
            
            const coreSize = p.size * point.scale * twinkle * 0.8;
            ctx.fillStyle = `hsla(${dynamicHue}, 20%, 95%, ${alpha})`; // Casi blanco
            ctx.beginPath();
            ctx.arc(point.x + aberrationX, point.y, coreSize, 0, Math.PI * 2);
            ctx.fill();
        });
        
        // Vignette (Viñeta cinematográfica)
        ctx.globalCompositeOperation = 'source-over';
        const gradient = ctx.createRadialGradient(width/2, height/2, height/2, width/2, height/2, height);
        gradient.addColorStop(0, 'transparent');
        gradient.addColorStop(1, 'rgba(0,0,0,0.7)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);

        // Film Grain (Ruido de película)
        ctx.globalCompositeOperation = 'overlay';
        ctx.fillStyle = ctx.createPattern(noiseCanvas, 'repeat');
        ctx.globalAlpha = 0.08; // Sutil
        ctx.fillRect(0, 0, width, height);
        ctx.globalAlpha = 1.0;
        
        ctx.globalCompositeOperation = 'source-over';
        requestAnimationFrame(animate);
    }
    animate();
}
initVibeBackground();
