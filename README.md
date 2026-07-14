<p align="center">
  <a href="http://genomagames.com/?utm_source=github&utm_medium=readme">
    <img alt="Genoma Games" src="./public/icon.png" width="78" />
  </a>
</p>
<h1 align="center">
  Genoma Games' Website
</h1>

## 🚀 Quick start

1. **Install npm dependencies**

   ```shell
   npm ci
   ```

1. **Set up the environment**

   Copy `.env.example` to `.env` and fill in the values. The file documents
   where each one comes from.

1. **Start developing**

   Start project.

   ```shell
   npm start
   ```

   Running at http://localhost:3000

1. **Test Production Build**

   ```shell
   npm run start:prod
   ```

   Running at http://localhost:3000

## 🌍 Deployment

The site runs with a server on Vercel, which builds and deploys every push to
`main`. The environment variables live in the Vercel project settings, and the
same ones are listed in `.env.example`.

## References

- [Hugo's Front Matter Variables](https://gohugo.io/content-management/front-matter/#front-matter-variables)
