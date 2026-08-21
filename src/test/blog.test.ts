import { describe, it, expect } from "vitest";

// Port of slug generation logic from BlogPost.tsx
function generateSlug(text: string): string {
  if (!text) return "";
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-zA-Z0-9\u0980-\u09FF]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Test case for mapping db models vs mock static data models
interface BlogItem {
  id: string;
  title: string;
  excerpt?: string;
  content: string;
  image_url?: string;
  image?: string;
  category: string;
  author?: string;
  read_time?: string;
  readTime?: string;
  created_at?: string;
  date?: string;
}

function processBlogDisplay(activePost: BlogItem) {
  return {
    id: activePost.id,
    title: activePost.title,
    excerpt: activePost.excerpt || activePost.content?.slice(0, 160).replace(/[#*_`\n\r]/g, " ").trim() + "...",
    content: activePost.content,
    image: activePost.image_url || activePost.image || "",
    category: activePost.category,
    author: activePost.author || "Rangao টিম",
    date: (() => {
      const rawDate = activePost.created_at;
      if (rawDate) {
        const d = new Date(rawDate);
        if (!isNaN(d.getTime())) {
          return d.toLocaleDateString("bn-BD");
        }
      }
      return activePost.date || new Date().toLocaleDateString("bn-BD");
    })(),
    readTime: activePost.read_time || activePost.readTime || "৫ মিনিট",
  };
}

describe("Blog & Tips Logic", () => {
  describe("generateSlug", () => {
    it("should generate lowercase slugs with hyphens for English text", () => {
      expect(generateSlug("Hello World Test!")).toBe("hello-world-test");
    });

    it("should preserve Bengali script characters correctly in slugs", () => {
      expect(generateSlug("ইসলামিক ক্যালিগ্রাফি দিয়ে ঘর সাজানো")).toBe("ইসলামিক-ক্যালিগ্রাফি-দিয়ে-ঘর-সাজানো");
    });

    it("should strip out consecutive and leading/trailing dashes", () => {
      expect(generateSlug("---Hello---World---")).toBe("hello-world");
    });
  });

  describe("processBlogDisplay", () => {
    it("should transform DB blog post fields to standard display format", () => {
      const dbPost: BlogItem = {
        id: "uuid-1234",
        title: "Test Title",
        content: "Detailed markdown content of the post",
        category: "গাইড",
        image_url: "https://example.com/img.jpg",
        author: "Admin User",
        read_time: "১০ মিনিট",
        created_at: "2026-06-01T12:00:00.000Z",
      };

      const result = processBlogDisplay(dbPost);
      expect(result.id).toBe("uuid-1234");
      expect(result.title).toBe("Test Title");
      expect(result.excerpt).toBe("Detailed markdown content of the post...");
      expect(result.image).toBe("https://example.com/img.jpg");
      expect(result.author).toBe("Admin User");
      expect(result.readTime).toBe("১০ মিনিট");
      expect(result.date).toContain("২০২৬"); // Bengali locale year representation
    });

    it("should fallback to static mock blog post field conventions correctly", () => {
      const staticPost: BlogItem = {
        id: "blog-001",
        title: "ইসলামিক ক্যালিগ্রাফি",
        excerpt: "সংক্ষিপ্ত রূপ",
        content: "মূল বিষয়বস্তু",
        image: "https://example.com/static.jpg",
        category: "টিপস",
        date: "২০২৬-০২-২০",
        readTime: "৫ মিনিট",
      };

      const result = processBlogDisplay(staticPost);
      expect(result.id).toBe("blog-001");
      expect(result.excerpt).toBe("সংক্ষিপ্ত রূপ");
      expect(result.image).toBe("https://example.com/static.jpg");
      expect(result.author).toBe("Rangao টিম");
      expect(result.readTime).toBe("৫ মিনিট");
      expect(result.date).toBe("২০২৬-০২-২০");
    });
  });
});
