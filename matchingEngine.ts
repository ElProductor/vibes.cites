// services/MatchingEngine.ts

// Tipos definidos para TypeScript
export interface UserValues {
  politicalView: string;
  religion: string;
  familyPlans: string;
  lifestyle: string;
  smoking?: string;
  pets?: string;
}

export interface User {
  id: string;
  birthDate: Date; // Necesario para edad
  heightCm?: number;
  education?: string;
  gender: string;
  genderPreference: string;
  values: UserValues;
  interests: string[];
  zodiacSign?: string;
  favorites: { category: string, value: string }[]; // Nuevo: Favoritos
  vibeScore: number;
  redFlags?: string[];
  greenFlags?: string[];
}

export interface Event {
  id: string;
  activityType: string;
  tags: string[]; // Ej: ['Nature', 'Physical', 'Morning']
  capacity: number;
}

export class VibeMatchingEngine {
  
  // Mapa de compatibilidad zodiacal simple
  private zodiacCompatibility: Record<string, string[]> = {
    'Leo': ['Aries', 'Sagittarius', 'Libra'],
    'Capricorn': ['Taurus', 'Virgo', 'Scorpio'],
    // ... resto de signos
  };

  private getZodiacScore(signA: string, signB: string): number {
    if (!signA || !signB) return 0;
    return (this.zodiacCompatibility[signA]?.includes(signB)) ? 15 : 0;
  }

  /**
   * REGLA 0: Filtros Demográficos Básicos
   */
  private checkBasicConstraints(userA: User, userB: User): boolean {
    // 1. Filtro de Género
    const matchA = userA.genderPreference === 'EVERYONE' || userA.genderPreference === userB.gender;
    const matchB = userB.genderPreference === 'EVERYONE' || userB.genderPreference === userA.gender;
    
    if (!matchA || !matchB) return false;

    // 2. Filtro de Edad (Rango +/- 10 años por defecto, configurable)
    const ageA = new Date().getFullYear() - new Date(userA.birthDate).getFullYear();
    const ageB = new Date().getFullYear() - new Date(userB.birthDate).getFullYear();
    
    if (Math.abs(ageA - ageB) > 10) return false;

    return true;
  }

  /**
   * REGLA 1: Filtro de Homofilia (Hard Filter)
   * Si los valores fundamentales chocan, no hay match, sin importar la atracción física.
   */
  private isCompatible(userA: User, userB: User): boolean {
    // Primero verificar demografía
    if (!this.checkBasicConstraints(userA, userB)) return false;

    const vA = userA.values;
    const vB = userB.values;

    // Lógica de "No Negociables"
    // 1. Planes de familia incompatibles son un bloqueo inmediato.
    if (vA.familyPlans !== vB.familyPlans) {
        if (vA.familyPlans === 'NO_KIDS' || vB.familyPlans === 'NO_KIDS') return false;
        if (vA.familyPlans === 'WANTS_KIDS' && vB.familyPlans === 'UNDECIDED') return false; // Riesgo alto
    }

    // 2. Estilos de vida opuestos (Party vs Homebody) suelen fallar a largo plazo.
    if ((vA.lifestyle === 'PARTY' && vB.lifestyle === 'HOMEBODY') ||
        (vA.lifestyle === 'HOMEBODY' && vB.lifestyle === 'PARTY')) {
      return false;
    }

    // 3. Política (Opcional según configuración del usuario, aquí estricto para el ejemplo)
    if (vA.politicalView !== vB.politicalView && 
       (vA.politicalView === 'LIBERAL' && vB.politicalView === 'CONSERVATIVE')) {
       return false;
    }

    // 4. Mascotas y Alergias (Nuevo)
    if (vA.pets === 'ALLERGIC' && (vB.pets === 'HAS_DOG' || vB.pets === 'HAS_CAT')) return false;
    
    // 5. Fumar (Nuevo)
    if (vA.smoking === 'NO' && vB.smoking === 'YES') return false;

    return true;
  }

  /**
   * REGLA 2: Afinidad por Actividad (Soft Score)
   * Calcula cuánto disfrutaría el usuario este evento específico.
   */
  private calculateEventAffinity(user: User, event: Event): number {
    let score = 0;

    // Coincidencia directa de intereses
    const interestMatch = user.interests.some(i => event.tags.includes(i));
    if (interestMatch) score += 50;

    // Coincidencia de Favoritos (Música/Cine) con el evento
    // Ej: Si el evento es un concierto y al usuario le gusta esa banda
    const favoriteMatch = user.favorites.some(f => event.tags.includes(f.value));
    if (favoriteMatch) score += 30;

    // Bonus Zodiacal (Si hay usuarios compatibles ya en el evento - lógica simplificada)
    // score += this.getZodiacScore(user.zodiacSign, 'Leo'); 

    // Ajuste por Vibe Score (Usuarios con buena reputación tienen prioridad)
    score += (user.vibeScore / 10); 

    return score;
  }

  /**
   * ALGORITMO PRINCIPAL: Generador de Lista de Invitados
   * Llena un evento maximizando la compatibilidad grupal.
   */
  public generateGuestList(event: Event, candidates: User[]): User[] {
    // 1. Filtrar candidatos que realmente quieren ir (Afinidad > 30)
    let pool = candidates
      .map(u => ({ user: u, score: this.calculateEventAffinity(u, event) }))
      .filter(item => item.score > 30)
      .sort((a, b) => b.score - a.score); // Los más entusiastas primero

    const guestList: User[] = [];

    // 2. Selección Iterativa con Verificación de Grupo
    for (const candidate of pool) {
      if (guestList.length >= event.capacity) break;

      const newUser = candidate.user;
      
      // Verificar si el nuevo usuario es compatible con TODOS los que ya están en la lista
      // Esto evita incomodidad social en el evento.
      const isGroupCompatible = guestList.every(existingMember => 
        this.isCompatible(newUser, existingMember)
      );

      if (isGroupCompatible) {
        guestList.push(newUser);
      }
    }

    return guestList;
  }
}
