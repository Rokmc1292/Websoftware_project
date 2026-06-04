# Project Idea Summary

Hill, also referred to in the codebase as "No Sweat, No Sweet", is an AI-powered body care coach that helps users record and understand their exercise, diet, and sleep data in one place. The project combines daily self-tracking with AI feedback so users can move beyond simple logs and receive practical guidance based on their own patterns. Users can record workout sessions, meals, sleep quality, body profile information, and view weekly or monthly trends. The core idea is to turn fragmented health records into personalized coaching insights.

# Problem Statement

People who exercise regularly often track workouts, meals, and sleep separately, which makes it difficult to understand how daily habits affect overall body condition. A workout log alone does not explain whether poor sleep should change today's training intensity, and a food diary alone does not connect nutrition goals with exercise recovery. This project tries to solve that fragmentation by collecting core body-care data in one service and using AI to provide easier, more actionable feedback.

# Target Users

- **Fitness beginners**: They need a simple way to record exercise, meals, and sleep without managing several separate tools.
- **Routine-based gym users**: They need workout session logging, favorite routines, exercise history, and AI feedback to improve repeated training patterns.
- **Diet-conscious users**: They need a meal record system that tracks calories and macronutrients against daily goals.
- **Users improving sleep and recovery**: They need sleep records, sleep quality scoring, wake-up goals, and coaching suggestions that connect rest with exercise planning.
- **Self-improvement or body recomposition users**: They need profile-based tracking such as height, weight, skeletal muscle mass, body fat mass, and notes for personalized feedback.

# Motivation

The project is motivated by the idea that body care is not only about exercising more. Exercise, food, and sleep influence each other, but users often record them in isolated apps or do not record them at all because the process feels repetitive. Hill aims to make personal health tracking more useful by turning records into feedback, summaries, and next actions. The project also reflects a practical hackathon-style goal: combine web development, authentication, database-backed personal records, wearable integration, and AI coaching into one coherent service.

# Core Concept

The service is a personal AI body-care dashboard. After signing in, users can manage three main areas: workout, diet, and sleep. Each area supports structured records, and those records can be reused, analyzed, or visualized.

The core concept is not just storing health data, but connecting that data to coaching. Workout sessions can receive AI analysis. Diet records can be created manually or estimated from food images, then reviewed by an AI diet coach. Sleep records include calculated quality metrics and can be used to generate sleep-based workout recommendations. A stats page provides a calendar and weekly graphs so users can see whether they recorded workout, diet, and sleep data on each day.

# Key Features

- **Workout Session Logging**
  - **Description**: Users can create, edit, delete, search, and filter workout sessions. Each session can include date, title, memo, duration, exercises, muscle group, sets, weight, reps, duration-based sets, and rest time.
  - **User value**: Helps users maintain a structured exercise history and review training volume over time.
  - **Related user flow**: User opens the workout page, creates a session, adds exercises and sets, saves the session, then reviews it in the session list.

- **Workout AI Feedback**
  - **Description**: A saved workout session can be analyzed by an AI coach using the session details and available profile data.
  - **User value**: Turns raw sets and reps into understandable feedback and next-session guidance.
  - **Related user flow**: User saves a workout session, clicks AI analysis, and receives session-level feedback.

- **Favorite Workout Routines**
  - **Description**: Users can mark workout sessions as favorites and load a favorite session as a template for a new workout.
  - **User value**: Reduces repeated manual input for users who follow recurring routines.
  - **Related user flow**: User favorites a session, opens the favorites panel, loads the routine, edits today's details, and saves it as a new session.

- **Diet Record Management**
  - **Description**: Users can record diet entries with food items, calories, protein, carbohydrates, and fat. Diet entries support editing, deletion, favorites, and daily goal tracking.
  - **User value**: Helps users compare actual food intake with nutrition targets.
  - **Related user flow**: User selects a date, adds a meal manually, reviews total calories and macros, and adjusts daily goals if needed.

- **AI Food Image Analysis**
  - **Description**: Users can upload a food image, and the system estimates food items and nutrition values using an AI model.
  - **User value**: Makes meal logging faster and lowers the effort required to enter nutrition data.
  - **Related user flow**: User uploads a meal photo, reviews AI-detected food items, edits them if needed, and saves them to a diet entry.

- **AI Diet Coach**
  - **Description**: The service can generate diet feedback based on selected-date meals, nutrition goals, totals, entries, and user profile information.
  - **User value**: Helps users understand whether their intake aligns with their goals.
  - **Related user flow**: User records meals for a date, requests AI coach feedback, and receives a concise coaching message.

- **Sleep Tracking**
  - **Description**: Users can record bedtime, wake time, sleep hours, satisfaction, memo, sleep quality score, freshness score, growth/recovery score, and wake-up mission completion.
  - **User value**: Helps users understand sleep quality and recovery instead of only tracking sleep duration.
  - **Related user flow**: User selects a date, enters sleep and wake times, rates sleep satisfaction, checks wake-up goals, and saves the record.

- **Sleep-Based AI Coaching**
  - **Description**: Sleep records can be analyzed to recommend workout intensity, suggested workouts, workouts to avoid, sleep feedback, and a practical action for the day.
  - **User value**: Helps users adjust training based on recovery condition.
  - **Related user flow**: User saves sleep data, requests sleep coach feedback, and receives exercise guidance for the day.

- **Fitbit Sleep Integration**
  - **Description**: Users can connect a Fitbit account through OAuth and import sleep data by date.
  - **User value**: Reduces manual sleep entry for users with wearable sleep data.
  - **Related user flow**: User connects Fitbit, selects a date, imports sleep data, and uses it in the sleep page.

- **Stats and Calendar Dashboard**
  - **Description**: The stats page shows monthly record presence for workout, diet, and sleep, plus weekly graphs for workout volume, diet calories, and sleep hours.
  - **User value**: Helps users see consistency and weekly lifestyle patterns at a glance.
  - **Related user flow**: User opens stats, clicks a calendar date, and reviews that week's activity graph.

- **User Profile and Personalization**
  - **Description**: Users can manage account details, profile note, height, weight, skeletal muscle mass, body fat mass, password, theme mode, and account deletion.
  - **User value**: Gives AI coaching more personal context and supports basic account control.
  - **Related user flow**: User opens My Page, updates body profile and notes, then future AI feedback can use that information.

- **Authentication and Social Login**
  - **Description**: The backend supports registration, login, JWT authentication, password changes, account deletion, and social OAuth login.
  - **User value**: Keeps personal records private and tied to individual accounts.
  - **Related user flow**: User signs up or logs in, then accesses protected workout, diet, sleep, stats, and profile pages.

# User Flow

1. A new user lands on the intro page and sees the service concept: record exercise, diet, and sleep, then receive AI coaching.
2. The user signs up or logs in.
3. The user enters profile information such as body measurements and personal notes in My Page.
4. The user records a workout session with exercises, muscle groups, sets, weight, reps, duration, and memo.
5. The user records meals manually or uploads a food image for AI nutrition estimation.
6. The user records sleep information manually or imports available Fitbit sleep data.
7. The user requests AI feedback from workout, diet, or sleep pages.
8. The user checks the stats page to review monthly record consistency and weekly trends.
9. Over time, the user repeats routines, reuses favorites, updates goals, and uses feedback to adjust behavior.

# Main Use Cases

- A gym user logs today's chest workout, asks for AI feedback, and favorites the routine for reuse next week.
- A user uploads a lunch photo, reviews AI-estimated calories and macros, edits the result, and saves it to the daily diet record.
- A user records poor sleep and receives a recommendation to lower workout intensity for the day.
- A user connects Fitbit and imports sleep data instead of entering sleep time manually.
- A user checks the weekly graph to compare workout volume, calories consumed, and sleep hours.
- A user updates body composition data so AI coaching can reflect their personal context.

# Value Proposition

Hill is useful because it connects three important parts of body care: exercise, nutrition, and sleep. Instead of only showing logs, it provides AI-generated interpretation and practical coaching messages. The service also reduces repeated input through favorite routines, food image analysis, and Fitbit sleep import. For users who want a complete but approachable self-care system, it offers a single place to record, review, and act on daily health data.

# Differentiation Points

- **Integrated tracking**: Workout, diet, sleep, profile, and stats are handled in one service.
- **AI coaching across multiple domains**: AI is used for workout feedback, diet feedback, food image analysis, and sleep-based exercise guidance.
- **Recovery-aware exercise guidance**: Sleep data is not isolated; it is used to suggest suitable workout intensity and actions.
- **Routine reuse**: Favorite workout sessions can become templates for new sessions.
- **Calendar-centered consistency view**: Monthly dots show whether workout, diet, and sleep were recorded on each day.
- **Wearable support**: Fitbit sleep import is included in the provided implementation.

# MVP Scope

Based on the provided project materials, the MVP appears to include:

- User registration, login, JWT-based authentication, logout, password change, and account deletion.
- User profile management with body measurements and personal notes.
- Workout session CRUD with exercises, sets, muscle groups, memo, duration, search, filters, pagination, favorites, routine reuse, and AI session analysis.
- Diet entry CRUD with food items, calories, macronutrients, daily goals, favorites, AI food image analysis, and AI diet feedback.
- Sleep record saving and lookup with calculated scores, wake-up goals, sleep memo, weekly sleep chart, AI sleep coaching, and Fitbit sleep import.
- Stats page with monthly record dots and weekly charts for workout volume, diet calories, and sleep hours.
- Light/dark theme preference in the frontend.

# Future Expansion Ideas

These ideas are not confirmed as implemented in the provided materials:

- Goal-based long-term plans, such as weight loss, muscle gain, maintenance, or race preparation programs.
- Automatic correlation analysis between sleep quality, diet intake, and workout performance.
- Push notifications or reminders for logging meals, workouts, sleep, or wake-up missions.
- Wearable integrations beyond Fitbit, such as Apple Health, Google Fit, Garmin, or Samsung Health.
- Progress photos or body measurement history charts.
- Social or coach-sharing features for trainers, mentors, or teams.
- Safer medical disclaimers and escalation guidance for unusual fatigue, pain, or sleep problems.
- Exportable reports for mentors, trainers, hackathon demos, or personal review.
- More advanced personalization based on training history, body composition trends, and user goals.

# Technical Overview

The project uses a React frontend built with Vite and React Router. The main pages are intro, login/signup, workout, diet, sleep, stats, and My Page. The backend is a Flask API with SQLAlchemy models, JWT authentication, CORS support, and database-backed user records.

The data model includes users, social identities, user profiles, workout sessions, workout sets, diet entries, diet items, sleep records, and Fitbit tokens. AI features use external AI services: workout coaching uses an Anthropic client, diet image analysis and diet coaching use Google Generative AI, and sleep coaching uses an OpenAI-compatible client. Fitbit OAuth is used to connect wearable sleep data.

# One-Line Pitch

Hill is an AI body-care coach that connects workout, diet, and sleep records into personalized daily guidance.

# Short Presentation Script

Hill is an AI-powered body care coach for people who want to understand their fitness habits more clearly. Many users track workouts, meals, and sleep in separate places, so they cannot easily see how these habits affect each other. Hill brings those records into one web service. Users can log workout sessions, track food and nutrition goals, record sleep quality, import Fitbit sleep data, and review weekly or monthly trends. The key difference is that Hill does not stop at record keeping. It uses AI to analyze workouts, estimate nutrition from food images, provide diet feedback, and recommend workout intensity based on sleep condition. The result is a practical personal dashboard that helps users decide what to do next, not just remember what they did before.
