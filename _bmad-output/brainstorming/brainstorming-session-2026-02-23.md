---
stepsCompleted: [1, 2, 3, 4]
inputDocuments: []
session_topic: 'Web clone of Undercover app'
session_goals: 'Next.js, TailwindCSS, Supabase, all roles, simple UI/UX, Vietnamese language, 500 word pairs'
selected_approach: 'ai-recommended'
techniques_used: ['Role Playing', 'SCAMPER Method', 'Morphological Analysis']
ideas_generated: []
context_file: ''
---

# Brainstorming Session Results

**Facilitator:** Dlqnchill
**Date:** 2026-02-23

## Session Overview

**Topic:** Web clone of Undercover app
**Goals:** Next.js, TailwindCSS, Supabase, all roles, simple UI/UX, Vietnamese language, 500 word pairs

### Context Guidance

_No context file provided._

### Session Setup

_Session initialized with focus on creating a web clone of the Undercover app using Next.js, TailwindCSS, and Supabase._

## Technique Selection

**Approach:** AI-Recommended Techniques
**Analysis Context:** Web clone of Undercover app with focus on specific roles and Vietnamese content

**Recommended Techniques:**

- **Role Playing:** Focus on UI/UX from perspective of all specific roles (Civilian, Undercover, Mr. White, God, etc.) to ensure smooth web experience.
- **SCAMPER Method:** Adapt and modify original app features for web environment (Next.js/Supabase).
- **Morphological Analysis:** Systematically generate 500+ word pairs across difficulty levels and topics.

**AI Rationale:** Selected to address the three main pillars: User Experience (Role Playing), Technical Implementation (SCAMPER), and Content Generation (Morphological Analysis).

## Technique Execution Results

**Role Playing (User Experience & Specific Roles):**

- **Interactive Focus:** Single device usage (Pass & Play), role-specific interactions (Civilian, Undercover, Mr. White), voting mechanism.
- **Key Breakthroughs:**
    - **Device Usage:** Keep it simple with **1 device passed around** (Pass & Play), no multi-device sync needed.
    - **Word Reveal:** Simple **click-to-reveal** mechanism (no hold/slide), prioritizing speed and simplicity.
    - **Voting:** **Public voting** (raise hands/discuss), app only used to record the elimination (click avatar to kill).
    - **Mr. White:** Simplified rules - if voted out, they are out (no guessing chance to win), keeping the flow fast.

- **User Creative Strengths:** Decisive focus on simplicity and core gameplay mechanics ("Simple is the best").
- **Energy Level:** High, focused on practical implementation.

**SCAMPER Method (Feature Adaptation & Tech Stack):**

- **Interactive Focus:** Database structure, Real-time synchronization, Room management.
- **Key Breakthroughs:**
    - **Sync Mechanism:** Adopted **Room Code** model (like Kahoot) for multi-device synchronization without login.
    - **Database Structure:** Simple schema with `rooms` table storing game state and `used_word_ids` to prevent repetition within a session.
    - **Real-time:** Utilizing **Supabase Realtime** to sync game state across all connected devices in a room.
    - **Session History:** Ephemeral session history (lost on reload) but persistent word tracking per room session.

- **User Creative Strengths:** Pragmatic approach to technical complexity - willing to adopt more complex backend (Realtime) for better user experience (Sync).
- **Energy Level:** Consistent, clear on technical requirements.

**Morphological Analysis (Content Generation & Database Structure):**

- **Interactive Focus:** Word pair categorization, difficulty levels, database schema for content.
- **Key Breakthroughs:**
    - **Word Pair Structure:** Database table `word_pairs` with columns for `id`, `word_civilian`, `word_undercover`, `category`, `difficulty`, `pack_id`.
    - **Game Modes:** Two modes: **Random** (balanced difficulty) and **Pack Selection** (themed).
    - **Content Strategy:** Focus on "Medium -> Hard" difficulty pairs to increase game tension.
    - **Database Choice:** Confirmed **Supabase** as the optimal choice for balance of features (Realtime, SQL) and ease of use/cost.

- **User Creative Strengths:** Clear vision for content quality and user choice.
- **Energy Level:** High, decisive on database technology.

## Idea Organization & Action Plan

### 1. Core Features (MVP)

- **Game Modes:** "Pass & Play" (Single Device) & "Room Sync" (Multi-Device via Room Code).
- **Role System:** Civilian, Undercover, Mr. White.
- **Game Flow:** Create Room -> Join Room -> Start Game -> Reveal Words -> Discuss -> Vote (Public) -> Eliminate -> Result.
- **Content:** 500+ Vietnamese word pairs (Medium -> Hard difficulty).

### 2. Technical Architecture

- **Frontend:** Next.js (App Router), TailwindCSS (Simple, clean UI).
- **Backend:** Supabase (PostgreSQL).
- **Real-time:** Supabase Realtime (for Room Sync).
- **State Management:** React Context + Supabase Realtime subscription.

### 3. Database Schema (Supabase)

- **`rooms` Table:**
    - `id` (uuid, PK)
    - `code` (text, unique, 4-6 chars)
    - `status` (text: 'waiting', 'playing', 'finished')
    - `current_word_pair_id` (int8, FK)
    - `used_word_ids` (int8[], array of used word IDs)
    - `players` (jsonb: list of players, roles, status)

- **`word_pairs` Table:**
    - `id` (int8, PK)
    - `word_civilian` (text)
    - `word_undercover` (text)
    - `category` (text)
    - `difficulty` (int2: 1-4)
    - `pack_id` (int8, nullable)

### 4. Next Steps

1.  **Initialize Project:** Set up Next.js + TailwindCSS + Supabase project.
2.  **Database Setup:** Create tables in Supabase based on schema.
3.  **Core Logic:** Implement Room creation and Realtime sync logic.
4.  **UI Implementation:** Build screens for Home, Lobby, Game (Card Reveal), Voting.
5.  **Content Import:** Generate and import 500 word pairs into Supabase.
