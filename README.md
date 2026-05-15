# Rossmann Sales Forecasting Dashboard

AI-powered retail sales forecasting dashboard for the Rossmann retail chain — IBM Internship Project

## Dashboard Screenshots

### Main Dashboard
<img width="1920" height="1080" alt="Screenshot 2026-05-15 144159" src="https://github.com/user-attachments/assets/0b860826-0049-42b9-89a8-02f361572974" />

### Sales History Analysis
<img width="1920" height="1080" alt="Screenshot 2026-05-15 144213" src="https://github.com/user-attachments/assets/a8e91b4b-2ff3-4594-b629-380f1dbef5d1" />


### Forecast Visualization
<img width="1920" height="1080" alt="Screenshot 2026-05-15 144239" src="https://github.com/user-attachments/assets/33b65315-2ac8-4e30-a414-9e2615d95605" />


### Insights
<img width="1920" height="1080" alt="Screenshot 2026-05-15 144257" src="https://github.com/user-attachments/assets/b369861f-61e2-4143-a78e-9f63093d10f9" />


### AI Assistant
<img width="1920" height="1080" alt="Screenshot 2026-04-26 142547" src="https://github.com/user-attachments/assets/251737e1-f4d2-439d-8517-a293f9cdc98e" />

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
