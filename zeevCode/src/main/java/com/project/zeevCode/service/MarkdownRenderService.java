package com.project.zeevCode.service;

import com.vladsch.flexmark.ext.autolink.AutolinkExtension;
import com.vladsch.flexmark.ext.gfm.strikethrough.StrikethroughExtension;
import com.vladsch.flexmark.ext.tables.TablesExtension;
import com.vladsch.flexmark.html.HtmlRenderer;
import com.vladsch.flexmark.parser.Parser;
import com.vladsch.flexmark.util.ast.Document;
import com.vladsch.flexmark.util.data.MutableDataSet;
import com.project.zeevCode.entity.FundamentalsRenderCache;
import com.project.zeevCode.entity.FundamentalsRepoCache;
import com.project.zeevCode.repository.FundamentalsRenderCacheRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class MarkdownRenderService {

    private static final Logger log = LoggerFactory.getLogger(MarkdownRenderService.class);
    private static final String REPO_OWNER = "23se02cs102";
    private static final String REPO_NAME = "CS-Fundamentals";
    private static final String RAW_BASE = "https://raw.githubusercontent.com/" + REPO_OWNER + "/" + REPO_NAME + "/main/";

    private final FundamentalsRenderCacheRepository renderCacheRepository;
    private final Parser parser;
    private final HtmlRenderer renderer;
    private final HttpClient httpClient;

    @Autowired
    public MarkdownRenderService(FundamentalsRenderCacheRepository renderCacheRepository) {
        this.renderCacheRepository = renderCacheRepository;
        this.httpClient = HttpClient.newBuilder().build();

        MutableDataSet options = new MutableDataSet();
        options.set(Parser.EXTENSIONS, Arrays.asList(
                TablesExtension.create(),
                StrikethroughExtension.create(),
                AutolinkExtension.create()
        ));
        options.set(HtmlRenderer.SOFT_BREAK, "<br />\n");
        this.parser = Parser.builder(options).build();
        this.renderer = HtmlRenderer.builder(options).build();
    }

    /**
     * Returns cached rendered HTML for the given chapter, rendering and caching on cache miss.
     */
    public String getRenderedHtml(FundamentalsRepoCache chapter) {
        Optional<FundamentalsRenderCache> cached = renderCacheRepository.findByBlobSha(chapter.getBlobSha());
        if (cached.isPresent()) {
            return cached.get().getRenderedHtml();
        }

        // Cache miss: fetch raw markdown, render, and store
        String rawMarkdown = fetchRawMarkdown(chapter.getChapterPath());
        if (rawMarkdown == null) {
            return "<p>Content temporarily unavailable. Please try again later.</p>";
        }

        String html = renderMarkdown(rawMarkdown, chapter.getChapterPath());

        FundamentalsRenderCache renderCache = FundamentalsRenderCache.builder()
                .blobSha(chapter.getBlobSha())
                .renderedHtml(html)
                .chapterPath(chapter.getChapterPath())
                .cachedAt(LocalDateTime.now())
                .build();
        renderCacheRepository.save(renderCache);

        return html;
    }

    private String fetchRawMarkdown(String chapterPath) {
        try {
            // URL-encode the path components
            String encodedPath = Arrays.stream(chapterPath.split("/"))
                    .map(part -> part.replace(" ", "%20")
                            .replace("&", "%26")
                            .replace("(", "%28")
                            .replace(")", "%29"))
                    .reduce((a, b) -> a + "/" + b)
                    .orElse(chapterPath);

            String url = RAW_BASE + encodedPath;
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .header("User-Agent", "ZeevCode/1.0")
                    .GET()
                    .build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() != 200) {
                log.warn("raw.githubusercontent.com returned {} for path: {}", response.statusCode(), chapterPath);
                return null;
            }
            return response.body();
        } catch (Exception e) {
            log.error("Failed to fetch raw markdown for {}: {}", chapterPath, e.getMessage());
            return null;
        }
    }

    private String renderMarkdown(String markdown, String chapterPath) {
        // Determine the base path for relative image URL rewriting
        String[] parts = chapterPath.split("/", 2);
        String folderPath = parts.length > 1 ? parts[0] + "/" : "";

        // Render to HTML
        Document document = parser.parse(markdown);
        String html = renderer.render(document);

        // Rewrite relative image src attributes to CDN URLs
        html = rewriteRelativeImages(html, folderPath);

        // Rewrite relative .md links to ZeevCode internal paths
        html = rewriteRelativeLinks(html, chapterPath);

        return html;
    }

    private String rewriteRelativeImages(String html, String folderPath) {
        // Match src="..." that don't start with http/https
        Pattern imgPattern = Pattern.compile("src=\"(?!https?://|data:)([^\"]+)\"");
        Matcher matcher = imgPattern.matcher(html);
        StringBuffer sb = new StringBuffer();
        while (matcher.find()) {
            String relativePath = matcher.group(1);
            String absoluteUrl = RAW_BASE + folderPath + relativePath;
            matcher.appendReplacement(sb, "src=\"" + absoluteUrl + "\"");
        }
        matcher.appendTail(sb);
        return sb.toString();
    }

    private String rewriteRelativeLinks(String html, String chapterPath) {
        // Rewrite relative .md href links — currently just strip .md extension
        // Links to other chapters within the same subject stay relative for now
        return html.replaceAll("href=\"([^\"]+)\\.md\"", "href=\"$1\"");
    }

    String getConfiguredRepositoryFullName() {
        return REPO_OWNER + "/" + REPO_NAME;
    }
}
