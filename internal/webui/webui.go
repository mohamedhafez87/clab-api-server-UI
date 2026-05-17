package webui

import (
	"embed"
	"io/fs"
	"net/http"
	"path"
	"strings"

	"github.com/gin-gonic/gin"
)

//go:embed static
var staticFiles embed.FS

func Register(router *gin.Engine) error {
	dist, err := fs.Sub(staticFiles, "static")
	if err != nil {
		return err
	}

	fileServer := http.FileServer(http.FS(dist))

	router.GET("/app", serveIndex(dist))
	router.GET("/app/*filepath", func(c *gin.Context) {
		setSecurityHeaders(c)

		requestPath := strings.TrimPrefix(c.Param("filepath"), "/")
		if requestPath == "" {
			serveIndexFile(c, dist)
			return
		}

		cleanPath := path.Clean(requestPath)
		if cleanPath == "." || cleanPath == ".." || strings.HasPrefix(cleanPath, "../") {
			c.Status(http.StatusNotFound)
			return
		}

		if file, err := dist.Open(cleanPath); err == nil {
			_ = file.Close()
			http.StripPrefix("/app/", fileServer).ServeHTTP(c.Writer, c.Request)
			return
		}

		if strings.HasPrefix(cleanPath, "assets/") {
			c.Status(http.StatusNotFound)
			return
		}

		serveIndexFile(c, dist)
	})

	return nil
}

func serveIndex(dist fs.FS) gin.HandlerFunc {
	return func(c *gin.Context) {
		setSecurityHeaders(c)
		serveIndexFile(c, dist)
	}
}

func serveIndexFile(c *gin.Context, dist fs.FS) {
	content, err := fs.ReadFile(dist, "index.html")
	if err != nil {
		c.String(http.StatusNotFound, "web UI is not available")
		return
	}

	c.Data(http.StatusOK, "text/html; charset=utf-8", content)
}

func setSecurityHeaders(c *gin.Context) {
	c.Header("Content-Security-Policy", "default-src 'self'; base-uri 'none'; object-src 'none'; frame-ancestors 'none'; img-src 'self' data: blob:; connect-src 'self' ws: wss:; script-src 'self'; style-src 'self'")
	c.Header("Referrer-Policy", "same-origin")
	c.Header("X-Content-Type-Options", "nosniff")
	c.Header("X-Frame-Options", "DENY")
}
