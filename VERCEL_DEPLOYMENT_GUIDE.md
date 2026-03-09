# Vercel Deployment Guide

Follow these exact steps to push this project to GitHub and deploy it on Vercel as a production application.

## 1. Push the Project to GitHub

Open your terminal in the root directory of the project (`link-shortener`) and run the following commands:

1. **Initialize Git Repository**:
   ```bash
   git init
   ```

2. **Create a `.gitignore` file** to prevent uploading unnecessary files:
   ```bash
   echo "node_modules/" > .gitignore
   echo "api/database.json" >> .gitignore
   ```

3. **Commit your files**:
   ```bash
   git add .
   git commit -m "Initial commit - Link Shortener prepared for Vercel"
   ```

4. **Create a new repository on GitHub**, then link it and push:
   ```bash
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
   git push -u origin main
   ```

## 2. Connect with Vercel and Deploy

1. Go to [Vercel.com](https://vercel.com/) and log in (or sign up using your GitHub account).
2. Click **"Add New..."** and select **"Project"**.
3. Under the **"Import Git Repository"** section, locate the repository you just pushed and click **"Import"**.
4. Configure the Project:
   - **Project Name**: `link-shortener` (or whatever you prefer)
   - **Framework Preset**: Vercel should automatically detect **Other** or **Node.js**. Leave it on the default setting.
   - **Root Directory**: Leave it as `./`
5. Click **"Deploy"**.

## 3. Important Notes on Persistence in Vercel

Vercel Serverless Functions have a read-only filesystem. We have optimized this codebase to write data into the temporary `/tmp` directory. 

* **What this means for production**: The dashboard will work flawlessly and Links will be shortened and redirected correctly. However, if the Vercel function goes to "sleep" (cold start), the `/tmp` memory will clear and reset the analytics count.
* **To achieve permanent persistence**: You should replace the `db.links` logic inside `api/index.js` to connect to a Vercel Storage integration (like **Vercel KV**, Supabase, or MongoDB). This involves setting up the integration in your Vercel Dashboard and reading the DB connection string from `process.env`.
