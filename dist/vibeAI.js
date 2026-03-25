"use strict";
// vibeAI.ts
// Motor Propietario de Inteligencia Artificial "Vibe Quantum AI"
Object.defineProperty(exports, "__esModule", { value: true });
exports.vibeAI = exports.VibeQuantumAI = void 0;
class VibeQuantumAI {
    /**
     * Analiza profundamente a dos usuarios y devuelve un índice de compatibilidad cuántica (0-100)
     */
    analyzeResonance(userA, userB) {
        const auraScore = this.calculateAuraSynergy(userA.vibe_color, userB.vibe_color);
        const astroScore = this.calculateAstroSynergy(userA.zodiac_sign, userB.zodiac_sign);
        const bioScore = this.analyzeBioLinguistics(userA.bio, userB.bio);
        // Ponderación de la IA (Peso de cada factor en la relación)
        // 40% Aura (Vibra en tiempo real), 30% Astrología, 30% Personalidad/Intereses
        let totalSynergy = Math.round((auraScore * 0.4) + (astroScore * 0.3) + (bioScore * 0.3));
        // Generar un "Insight" o frase rompehielos basada en el factor más fuerte
        let insight = "";
        if (auraScore >= astroScore && auraScore >= bioScore) {
            insight = `Sus auras están en una resonancia del ${auraScore}%. ¡Química visual pura! ✨`;
        }
        else if (astroScore >= auraScore && astroScore >= bioScore) {
            insight = `Los astros dictan un ${astroScore}% de compatibilidad cósmica. 🌙`;
        }
        else {
            insight = `Tienen una coincidencia léxica del ${bioScore}% en su forma de ver la vida. 🗣️`;
        }
        return {
            synergy: totalSynergy,
            breakdown: { aura: auraScore, astro: astroScore, lifestyle: bioScore },
            insight: insight
        };
    }
    /**
     * 1. RESONANCIA DE AURA: Extrae el HUE matemático (Tono) de un HSL o HEX y calcula armonía.
     */
    calculateAuraSynergy(colorA, colorB) {
        if (!colorA || !colorB)
            return 50; // Neutral si faltan datos
        const hueA = this.extractHue(colorA);
        const hueB = this.extractHue(colorB);
        // Calcular distancia en la rueda de colores (0 a 180 grados)
        let diff = Math.abs(hueA - hueB);
        if (diff > 180)
            diff = 360 - diff;
        // Lógica Cuántica de Colores:
        // Diferencia < 30: Análogos (Misma vibra, se entienden bien) -> Alto score
        // Diferencia ~ 180 (150-180): Complementarios (Polos opuestos se atraen) -> Altísimo score
        // Diferencia ~ 90: Cuadratura (Choque de energías) -> Bajo score
        if (diff <= 30)
            return 85 + (30 - diff) / 2;
        if (diff >= 150)
            return 90 + (diff - 150) / 3;
        if (diff >= 75 && diff <= 105)
            return 40; // Choque
        return 70; // Armonía general
    }
    extractHue(color) {
        const match = color.match(/hsl\((\d+)/);
        return match ? parseInt(match[1]) : Math.floor(Math.random() * 360);
    }
    /**
     * 2. MATRIZ ASTROLÓGICA (Fuego, Tierra, Aire, Agua)
     */
    calculateAstroSynergy(signA, signB) {
        const elements = {
            'Aries': 'Fire', 'Leo': 'Fire', 'Sagittarius': 'Fire',
            'Taurus': 'Earth', 'Virgo': 'Earth', 'Capricorn': 'Earth',
            'Gemini': 'Air', 'Libra': 'Air', 'Aquarius': 'Air',
            'Cancer': 'Water', 'Scorpio': 'Water', 'Pisces': 'Water'
        };
        const elA = elements[signA];
        const elB = elements[signB];
        if (!elA || !elB)
            return 60;
        if (elA === elB)
            return 95; // Mismo elemento (Profunda conexión)
        // Complementarios cósmicos
        if ((elA === 'Fire' && elB === 'Air') || (elA === 'Air' && elB === 'Fire'))
            return 90;
        if ((elA === 'Earth' && elB === 'Water') || (elA === 'Water' && elB === 'Earth'))
            return 90;
        // Elementos en tensión
        if ((elA === 'Fire' && elB === 'Water') || (elA === 'Water' && elB === 'Fire'))
            return 45;
        if ((elA === 'Earth' && elB === 'Air') || (elA === 'Air' && elB === 'Earth'))
            return 50;
        return 75; // Mezclas creativas
    }
    /**
     * 3. ANÁLISIS LINGÜÍSTICO (NLP Básico): Tokenización y Overlap Léxico
     */
    analyzeBioLinguistics(bioA, bioB) {
        if (!bioA || !bioB)
            return 50;
        const clean = (text) => text.toLowerCase().replace(/[^\w\sáéíóú]/g, '').split(' ').filter(w => w.length > 3);
        const wordsA = new Set(clean(bioA));
        const wordsB = new Set(clean(bioB));
        if (wordsA.size === 0 || wordsB.size === 0)
            return 50;
        let matches = 0;
        wordsA.forEach(w => { if (wordsB.has(w))
            matches++; });
        // Cálculo de Jaccard Similarity modificado para redes sociales
        const unionSize = wordsA.size + wordsB.size - matches;
        const similarity = (matches / unionSize) * 100;
        // Un bio-match perfecto es raro. Si tienen al menos 2 palabras clave idénticas, es un éxito enorme.
        let score = 50 + (matches * 15);
        return Math.min(100, score);
    }
    /**
     * 4. COPYWRITING CUÁNTICO: Optimiza la biografía del usuario
     */
    enhanceBio(currentBio, zodiac) {
        const keywords = currentBio.length > 5 ? currentBio : "Buscando buenas energías";
        const templates = [
            `✨ Vibrando en mi propia frecuencia. ${keywords} | Orgulloso ${zodiac} buscando conexiones reales.`,
            `🌙 Explorador/a de la ciudad nocturna. ${keywords} | Energía de ${zodiac} al 100%.`,
            `🔥 ${zodiac} en su "main character era". ${keywords} | ¿Hacemos match de auras?`,
            `🔮 Fluyendo con el universo. ${keywords} | ${zodiac} en busca de mentes creativas.`
        ];
        return templates[Math.floor(Math.random() * templates.length)];
    }
    /**
     * 5. GESTIÓN DE EVENTOS: Predicción de experiencia de usuario en un evento
     */
    evaluateEventSuitability(userZodiac, eventVibe) {
        const vibe = eventVibe.toLowerCase();
        if (vibe.includes('chill') || vibe.includes('deep')) {
            return '✨ Ideal para recargar tu aura social.';
        }
        else if (vibe.includes('wild') || vibe.includes('dancing')) {
            return '🔥 Energía máxima: Prepárate para el caos divertido.';
        }
        return '💫 Sintonía equilibrada: Buen lugar para networking.';
    }
    /**
     * 6. ICEBREAKER INTELIGENTE: Rompehielos inicial
     */
    generateIcebreaker(synergy, insight) {
        if (synergy > 85)
            return `¡Nuestras auras están en ${synergy}%! ${insight} ¿Qué te apasiona últimamente?`;
        if (synergy > 70)
            return `Tenemos buena resonancia. ${insight} ¿Cuál es tu plan para el finde?`;
        return `¡Hola! La IA dice que nuestras energías se cruzan. ¿Cómo va tu día?`;
    }
    /**
     * 7. PREDICCIÓN DIARIA (HORÓSCOPO CUÁNTICO)
     */
    generateDailyForecast(zodiac) {
        const forecasts = [
            `El universo está alineado a tu favor. La energía de ${zodiac} vibra fuerte hoy, atrayendo auras complementarias. ¡Sal y conecta! ✨`,
            `Día de introspección cuántica. Tu luz interior está recargándose. Excelente momento para compartir tus pensamientos en el Social Feed. 🌙`,
            `¡Alerta de alta frecuencia! Los astros indican que hoy podrías cruzarte con alguien que alcance más del 90% de sinergia contigo. Mantén el radar encendido. 🔥`,
            `Fluye con el entorno. Busca personas con auras cálidas hoy para balancear tu propia energía y disfrutar la noche sin presiones. 🔮`
        ];
        // Usar la fecha para que cambie cada día, pero sea consistente en el mismo día
        return forecasts[new Date().getDate() % forecasts.length];
    }
    /**
     * Helper: Calcula la edad a partir de la fecha de nacimiento
     */
    calculateAge(birthDate) {
        if (!birthDate)
            return 18;
        const today = new Date();
        const birth = new Date(birthDate);
        let age = today.getFullYear() - birth.getFullYear();
        const m = today.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
            age--;
        }
        return age;
    }
}
exports.VibeQuantumAI = VibeQuantumAI;
exports.vibeAI = new VibeQuantumAI();
