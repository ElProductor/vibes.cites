import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as FacebookStrategy } from 'passport-facebook';
import { AuthService } from './authService';

const authService = new AuthService();
const PORT = process.env.PORT || 3000;

// --- CONFIGURACIÓN GOOGLE ---
if (process.env.GOOGLE_CLIENT_ID) {
    passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID.trim(),
        clientSecret: (process.env.GOOGLE_CLIENT_SECRET || '').trim(),
        callbackURL: '/auth/google/callback',
        proxy: true, // Fundamental para Railway y proxies
        passReqToCallback: true // Importante para recibir el vibe_color del state
      },
      async (req, accessToken, refreshToken, profile, done) => {
        try {
          // Recuperamos el vibe_color del parámetro 'state' que enviamos desde el frontend
          let vibeColor = 'hsl(270, 100%, 60%)'; // Color por defecto
          if (req.query.state && typeof req.query.state === 'string') {
              try {
                  const decoded = Buffer.from(req.query.state, 'base64').toString();
                  const stateObj = JSON.parse(decoded);
                  if (stateObj.vibeColor) vibeColor = stateObj.vibeColor;
              } catch (e) { console.error("Error parsing state:", e); }
          }
    
          const result = await authService.findOrCreateSocialUser(profile, 'google', vibeColor);
          
          if (!result.success) {
              console.error("❌ Error en Google Login:", result.message);
              return done(null, false); // Esto activará el failureRedirect
          }
          return done(null, result); // Éxito
        } catch (err) {
          return done(err, undefined);
        }
      }
    ));
} else {
    console.warn("⚠️ GOOGLE_CLIENT_ID no configurado. El login social de Google está desactivado.");
}

// --- CONFIGURACIÓN FACEBOOK ---
if (process.env.FACEBOOK_APP_ID) {
    passport.use(new FacebookStrategy({
        clientID: process.env.FACEBOOK_APP_ID,
        clientSecret: process.env.FACEBOOK_APP_SECRET || '',
        callbackURL: '/auth/facebook/callback',
        proxy: true, // Fundamental para Railway y proxies
        profileFields: ['id', 'emails', 'name', 'photos'], // Campos requeridos
        passReqToCallback: true
      },
      async (req, accessToken, refreshToken, profile, done) => {
        try {
          const state = req.query.state ? JSON.parse(Buffer.from(req.query.state as string, 'base64').toString()) : {};
          const vibeColor = state.vibeColor;
    
          const result = await authService.findOrCreateSocialUser(profile, 'facebook', vibeColor);
          
          if (!result.success) {
              console.error("❌ Error en Facebook Login:", result.message);
              return done(null, false);
          }
          return done(null, result);
        } catch (err) {
          return done(err, undefined);
        }
      }
    ));
} else {
    console.warn("⚠️ FACEBOOK_APP_ID no configurado. El login social de Facebook está desactivado.");
}

// Serialización (no necesaria si usamos JWT stateless, pero requerida por Passport)
passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user as any));

export default passport;

// --- RUTAS SUGERIDAS PARA TU SERVER.TS ---
/*
import passportConfig from './passport'; // Importar para que se ejecute la config

// Ruta de inicio (Frontend llama a esta)
app.get('/auth/google', (req, res, next) => {
    // Empaquetamos el vibe_color en el estado para recuperarlo al volver
    const state = req.query.vibe_color ? 
        Buffer.from(JSON.stringify({ vibeColor: req.query.vibe_color })).toString('base64') : undefined;
    
    passport.authenticate('google', { 
        scope: ['profile', 'email'],
        state: state 
    })(req, res, next);
});

// Callback (Google llama a esta)
app.get('/auth/google/callback', 
    passport.authenticate('google', { session: false, failureRedirect: '/login' }),
    (req, res) => {
        // req.user contiene { success, user, token } devuelto por authService
        const data = req.user as any;
        // Redirigir al frontend con el token en la URL para que lo guarde
        res.redirect(`/?token=${data.token}&user=${encodeURIComponent(JSON.stringify(data.user))}`);
    }
);

// (Lo mismo aplica para las rutas de Facebook)
*/
