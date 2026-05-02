# 🐱 Interactive Cat Game for Kids

A fun, colorful, and interactive web-based game designed for young children (ages 3+). Feed the cat with fish and milk, watch adorable animations, and enjoy a child-friendly interface!

![Cat Game](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Vite](https://img.shields.io/badge/Vite-7.2.4-646CFF.svg?logo=vite)

## ✨ Features

- 🎮 **Touch-Friendly Interface** - Perfect for smartphones and tablets
- 🐱 **Cute Cat Character** - Interactive cat with expressive animations
- 🐟 **Feed the Cat** - Multiple food options (fish and milk)
- ❤️ **Score Tracking** - Keep track of how happy your cat is!
- 🎨 **Colorful Design** - Vibrant colors optimized for young children
- 📱 **Responsive Layout** - Works seamlessly on all devices
- 🎵 **Visual Feedback** - Engaging animations and effects

## 🚀 Installation

### Prerequisites

Before you begin, ensure you have the following installed:
- [Node.js](https://nodejs.org/) (version 14 or higher)
- npm (comes with Node.js)

### Local Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/ahmadngiliyun00/cat-game.git
   cd cat-game
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run the development server**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   
   Navigate to `http://localhost:5173` (or the port shown in your terminal)

## 🏗️ Build for Production

To create an optimized production build:

```bash
npm run build
```

The built files will be in the `dist` folder, ready to be deployed.

To preview the production build locally:

```bash
npm run preview
```

## 🌐 Hosting Online

You can deploy this game to various hosting platforms. Here are several popular options:

### Option 1: GitHub Pages (Free)

1. **Install gh-pages**
   ```bash
   npm install --save-dev gh-pages
   ```

2. **Update package.json**
   
   Add these lines to your `package.json`:
   ```json
   {
     "homepage": "https://ahmadngiliyun00.github.io/cat-game",
     "scripts": {
       "predeploy": "npm run build",
       "deploy": "gh-pages -d dist"
     }
   }
   ```

3. **Add base path to vite.config.js**
   
   Create `vite.config.js` in the root directory:
   ```javascript
   import { defineConfig } from 'vite'
   
   export default defineConfig({
     base: '/cat-game/'
   })
   ```

4. **Deploy**
   ```bash
   npm run deploy
   ```

5. **Enable GitHub Pages**
   - Go to your repository settings
   - Navigate to "Pages"
   - Select `gh-pages` branch as source
   - Your game will be live at `https://ahmadngiliyun00.github.io/cat-game`

### Option 2: Vercel (Free)

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Deploy**
   ```bash
   vercel
   ```

3. **Follow the prompts** and your game will be live instantly!

   Or deploy via Vercel Dashboard:
   - Visit [vercel.com](https://vercel.com)
   - Import your GitHub repository
   - Vercel will auto-detect Vite and deploy automatically

### Option 3: Netlify (Free)

**Via Netlify CLI:**

1. **Install Netlify CLI**
   ```bash
   npm install -g netlify-cli
   ```

2. **Build and Deploy**
   ```bash
   npm run build
   netlify deploy --prod --dir=dist
   ```

**Via Netlify Dashboard:**

1. Visit [netlify.com](https://netlify.com)
2. Click "Add new site" → "Import an existing project"
3. Connect your GitHub repository
4. Build settings:
   - Build command: `npm run build`
   - Publish directory: `dist`
5. Click "Deploy site"

### Option 4: Cloudflare Pages (Free)

1. Visit [pages.cloudflare.com](https://pages.cloudflare.com)
2. Connect your GitHub account
3. Select your repository
4. Build settings:
   - Framework preset: Vite
   - Build command: `npm run build`
   - Build output directory: `dist`
5. Click "Save and Deploy"

## 📁 Project Structure

```
cat-game/
├── public/
│   └── images/          # Game images (cat, fish, milk)
├── src/
│   ├── main.js          # Main game logic
│   ├── style.css        # Styling
│   └── counter.js       # Utility function
├── index.html           # Main HTML file
├── package.json         # Project dependencies
├── .gitignore          # Git ignore rules
├── LICENSE             # MIT License
└── README.md           # This file
```

## 🎮 How to Play

1. **Click on the cat** to interact with it
2. **Choose food** - Click either the fish 🐟 or milk 🥛 button
3. **Watch** as the cat enjoys the food with cute animations
4. **Keep feeding** to increase your score!

## 🛠️ Technologies Used

- **Vite** - Fast build tool and dev server
- **Vanilla JavaScript** - Pure JS, no frameworks
- **CSS3** - Modern styling with animations
- **HTML5** - Semantic markup

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👤 Author

**Ahmad Ngiliyun**

- GitHub: [@ahmadngiliyun00](https://github.com/ahmadngiliyun00)
- GitLab: [@ahmadngiliyun00](https://gitlab.com/ahmadngiliyun00)
- Email: [ahmadngiliyun@gmail.com](mailto:ahmadngiliyun@gmail.com)
- LinkedIn: [ahmadngiliyun00](https://linkedin.com/in/ahmadngiliyun00)
- Stack Overflow: [ahmadngiliyun00](https://stackoverflow.com/users/ahmadngiliyun00)
- X (Twitter): [@ahmadngiliyun00](https://x.com/ahmadngiliyun00)
- Facebook: [ahmadngiliyun00](https://facebook.com/ahmadngiliyun00)
- Instagram: [@ahmadngiliyun00](https://instagram.com/ahmadngiliyun00)

## 🙏 Acknowledgments

- Designed for young children with love ❤️
- Built with modern web technologies
- Open source and free to use!

## 📞 Support

If you have any questions or need help, feel free to:
- Open an issue on GitHub
- Email me at ahmadngiliyun@gmail.com

---

**Made with ❤️ for kids everywhere!**

Enjoy playing with the cat! 🐱✨
