var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var user = { _id: 1, username: 'admin', password: 'heslo123' };

// Register a login strategy
passport.use('login', new LocalStrategy(function(username, password, done) {
    if (username === user.username && password === user.password) {
        return done(null, user);
    } else {
        done(null, false, { message: 'Nesprávné jméno nebo heslo.' });
    }
}));

// Required for storing user info into session 
passport.serializeUser(function(user, done) {
    done(null, user._id);
});
    
// Required for retrieving user from session
passport.deserializeUser(function(id, done) {
    done(null, user);
});

module.exports = passport;