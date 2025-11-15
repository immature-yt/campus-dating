import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { Like } from '../models/Like.js';

const router = express.Router();

// SFW Truth questions
const TRUTH_QUESTIONS = [
  "What's the most embarrassing thing that's ever happened to you?",
  "What's your biggest fear?",
  "What's the worst lie you've ever told?",
  "What's something you've never told your parents?",
  "What's your most annoying habit?",
  "What's the most trouble you've ever gotten into?",
  "What's something you're secretly good at?",
  "What's your biggest pet peeve?",
  "What's the most childish thing you still do?",
  "What's something you wish you could change about yourself?",
  "What's the weirdest food combination you enjoy?",
  "What's your guilty pleasure?",
  "What's something you're afraid to try?",
  "What's the most spontaneous thing you've ever done?",
  "What's a secret talent you have?",
  "What's the worst gift you've ever received?",
  "What's something you do when no one is watching?",
  "What's your most embarrassing childhood memory?",
  "What's something you've always wanted to learn?",
  "What's the funniest thing that's happened to you recently?"
];

// SFW Dare challenges
const DARE_CHALLENGES = [
  "Do your best impression of someone in the room",
  "Sing a song chosen by the other person",
  "Dance with no music for 1 minute",
  "Let the other person post a status on your social media",
  "Eat a spoonful of a condiment",
  "Do 20 push-ups",
  "Call your mom and tell her you love her",
  "Let the other person go through your phone for 1 minute",
  "Speak in an accent for the next 3 rounds",
  "Do your best celebrity impression",
  "Let the other person draw on your face with a washable marker",
  "Do a cartwheel",
  "Let the other person choose your profile picture for a day",
  "Do your best impression of a famous person",
  "Let the other person read your last 5 text messages out loud",
  "Do 10 jumping jacks",
  "Let the other person control your music for the next hour",
  "Do your best animal impression",
  "Let the other person choose what you eat for your next meal",
  "Do a TikTok dance"
];

// Get a random truth question
router.get('/truth', requireAuth, (req, res) => {
  const randomIndex = Math.floor(Math.random() * TRUTH_QUESTIONS.length);
  res.json({ 
    question: TRUTH_QUESTIONS[randomIndex],
    type: 'truth'
  });
});

// Get a random dare challenge
router.get('/dare', requireAuth, (req, res) => {
  const randomIndex = Math.floor(Math.random() * DARE_CHALLENGES.length);
  res.json({ 
    question: DARE_CHALLENGES[randomIndex],
    type: 'dare'
  });
});

// Get random question (truth or dare)
router.get('/random', requireAuth, (req, res) => {
  const isTruth = Math.random() > 0.5;
  const questions = isTruth ? TRUTH_QUESTIONS : DARE_CHALLENGES;
  const randomIndex = Math.floor(Math.random() * questions.length);
  
  res.json({ 
    question: questions[randomIndex],
    type: isTruth ? 'truth' : 'dare'
  });
});

export default router;

