import os
import time
from typing import List, Dict

# Trafilatura Core & Navigation
import trafilatura
from trafilatura import sitemaps, feeds
from trafilatura.settings import Extractor

# Vector DB & Chunking
import chromadb
from chromadb.utils import embedding_functions
from langchain_text_splitters import RecursiveCharacterTextSplitter

class AdvancedPortfolioIngestor:
    def __init__(self, persist_dir="portfolio_db_v2"):
        print("🚀 Initializing Advanced Ingestor...")
        
        # 1. Setup ChromaDB
        self.chroma_client = chromadb.PersistentClient(path=persist_dir)
        self.embedding_fn = embedding_functions.SentenceTransformerEmbeddingFunction(
            model_name="all-MiniLM-L6-v2"
        )
        self.collection = self.chroma_client.get_or_create_collection(
            name="portfolio_data",
            embedding_function=self.embedding_fn
        )
        
        # 2. Setup Smart Chunker
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=500, chunk_overlap=50, separators=["\n\n", "\n", ". ", " "]
        )
        
        # 3. Configure Trafilatura Settings (New per documentation)
        # Using the Extractor class is cleaner than passing 10 arguments
        self.extract_options = Extractor(
            output_format="txt",  # Plain text output for chunking
            with_metadata=False,  # Metadata extracted separately
            lang="en",  # Target language (corrected from target_lang)
            comments=False,  # Exclude comment sections (corrected from include_c)
            tables=True,  # Include tables
            links=False,  # Exclude links
            dedup=True  # Enable deduplication
        )

    def discover_urls(self, base_url: str) -> List[str]:
        """
        Uses Sitemaps and Feeds to find all valid pages.
        """
        print(f"\n🔎 Discovery Phase: {base_url}")
        found_urls = set()

        # Strategy A: Sitemap Search (The "Gold Standard" from docs)
        print("   Checking Sitemaps...")
        sitemap_links = sitemaps.sitemap_search(base_url)
        if sitemap_links:
            print(f"   ✅ Found {len(sitemap_links)} URLs via Sitemap.")
            found_urls.update(sitemap_links)
        
        # Strategy B: Feed Search (Good for blogs/updates)
        print("   Checking RSS/Atom Feeds...")
        feed_links = feeds.find_feed_urls(base_url)
        if feed_links:
            print(f"   ✅ Found {len(feed_links)} URLs via Feeds.")
            found_urls.update(feed_links)

        # Strategy C: Fallback to Homepage if nothing found
        if not found_urls:
            print("   ⚠️ No Sitemaps/Feeds found. Using Homepage only.")
            found_urls.add(base_url)

        return list(found_urls)

    def process_and_store(self, urls: List[str]):
        """
        Downloads, extracts using precision settings, and embeds.
        """
        print(f"\n⚙️  Processing {len(urls)} URLs...")
        
        ids, documents, metadatas = [], [], []

        for url in urls:
            try:
                # 1. Download
                downloaded = trafilatura.fetch_url(url)
                if not downloaded: continue

                # 2. Extract using the 'extract' wrapper with our options
                # Note: We use favor_precision=True to reduce noise (navbars/ads)
                result_text = trafilatura.extract(
                    downloaded, 
                    options=self.extract_options,
                    favor_precision=True
                )
                
                # 3. Extract Metadata separately for the DB
                # We use bare_extraction to get the metadata dict easily if needed, 
                # but trafilatura.extract with json output also works. 
                # Here we parse the JSON result from step 2 if we set format=json,
                # OR we just extract metadata explicitly:
                meta = trafilatura.extract_metadata(downloaded)
                
                if result_text and len(result_text) > 100:
                    # Chunking
                    chunks = self.text_splitter.split_text(result_text)
                    
                    for i, chunk in enumerate(chunks):
                        ids.append(f"{url}_{i}")
                        documents.append(chunk)
                        metadatas.append({
                            "url": url,
                            "title": meta.title if meta and meta.title else "Unknown",
                            "date": meta.date if meta and meta.date else ""
                        })
                        
                print(f"   ✅ Processed: {url}")
                time.sleep(0.5) # Polite delay

            except Exception as e:
                print(f"   ❌ Error on {url}: {e}")

        # 4. Batch Store
        if ids:
            self.collection.upsert(ids=ids, documents=documents, metadatas=metadatas)
            print(f"\n💾 Saved {len(ids)} chunks to database.")

if __name__ == "__main__":
    engine = AdvancedPortfolioIngestor()
    
    # Example: A blog often has a sitemap or RSS feed
    target_site = "https://huggingface.co/blog"
    
    # 1. Auto-discover all pages
    urls = engine.discover_urls(target_site)
    
    # 2. Process them
    # Limit to 5 for this demo to save time
    engine.process_and_store(urls[:5])

    # 3. Example query after processing
    # Query for content related to machine learning or AI projects
    query_results = engine.collection.query(
        query_texts=["machine learning projects and experience"],
        n_results=3,  # Return top 3 most similar chunks
        include=["documents", "metadatas", "distances"]  # Include text, metadata, and similarity scores
    )

    # Print the results
    print("\n🔍 Query Results:")
    for i, (doc, meta, dist) in enumerate(zip(query_results["documents"][0], query_results["metadatas"][0], query_results["distances"][0])):
        print(f"Result {i+1} (Distance: {dist:.4f}):")
        print(f"URL: {meta['url']}")
        print(f"Title: {meta['title']}")
        print(f"Date: {meta['date']}")
        print(f"Content: {doc[:200]}...")  # First 200 characters
        print("-" * 50)

