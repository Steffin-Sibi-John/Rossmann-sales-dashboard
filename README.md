# Rossmann Sales Forecasting Dashboard

AI-powered retail sales forecasting dashboard for the Rossmann retail chain — IBM Internship Project

## Features

* Sales history charts for all 1,115 stores
* 6–12 month forecasting using Facebook Prophet
* XGBoost model with approximately 84% accuracy (MAPE: 15.99%)
* Whiskey AI assistant powered by Groq API

## Tech Stack

* Frontend: React.js + TypeScript + Recharts
* Backend: Node.js + tRPC + Express
* ML Models: XGBoost + Prophet (Python/Colab)
* AI: Groq Cloud API (Llama 3)

## Dataset

Rossmann Store Sales — Kaggle

* 1,017,209 records
* 1,115 stores
* Data from 2013–2015

## Setup

1. Clone the repository
2. Run `npm install`
3. Add a `.env` file with:

   ```env
   GROQ_API_KEY=your_key
   ```
4. Add data JSON files to the `/data` folder
5. Run `npm run dev`

## Team

* Steffin Sibi John
* Mohamed Sabah
* Faayiz Shaju

IBM Internship — April 2026
Yenepoya University
