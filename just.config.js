module.exports = {
    mode: "redirector", 
    redirect_config: {
        url: "https://jssc.js.org/docs/download",
        params: {
            title: "Redirecting... | JSSC",
            description: "Open-source, self-validating, lossless string compression algorithm designed specifically for JavaScript",
            keywords: "JSSC, download",
            htmlLang: "en",
            robots: "index",
        }
    },
    sitemap: {
        generateSitemap: true,
        protocol: 'https:',
        base: 'dist'
    }
}
