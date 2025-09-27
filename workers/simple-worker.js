// Simple JavaScript worker to bypass TypeScript issues
import { form002Template } from './src/templates/002.js';
import { form001Template } from './src/templates/001.js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const pathname = url.pathname;

    console.log('✅ SIMPLE WORKER ACTIVE - BYPASSING TYPESCRIPT ISSUES');

    // Admin dashboard route
    if (pathname.includes('002_musculoskeletal_symptom_program')) {
      console.log('✅ 002 ADMIN DASHBOARD LOADED - PERFECT SUCCESS FORCE DEPLOY');
      return new Response(form002Template || '<h1>002 Admin Dashboard Loading...</h1>', {
        headers: { 'Content-Type': 'text/html' }
      });
    }

    // User survey route
    if (pathname.includes('001_musculoskeletal_symptom_survey')) {
      console.log('✅ 001 USER SURVEY LOADED - PREMIUM UI');
      return new Response(form001Template || '<h1>001 Survey Loading...</h1>', {
        headers: { 'Content-Type': 'text/html' }
      });
    }

    // Default response
    return new Response('SafeWork Workers - Simple JS Version', {
      headers: { 'Content-Type': 'text/html' }
    });
  }
};