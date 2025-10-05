import requests
from bs4 import BeautifulSoup
import time
import re
from urllib.parse import urljoin, urlparse
from typing import List, Dict, Tuple
import hashlib

class WebDataCollector:
    def __init__(self):
        # Nguồn uy tín đã verify
        self.trusted_sources = {
            'vietnam.gov.vn': {'weight': 95, 'type': 'official'},
            'dangcongsan.vn': {'weight': 95, 'type': 'official'},
            'nxbctqg.org.vn': {'weight': 90, 'type': 'publisher'},
            'hcma.vn': {'weight': 85, 'type': 'academic'},
            'tapchicongsan.org.vn': {'weight': 85, 'type': 'academic'},
            'historymatters.gmu.edu': {'weight': 80, 'type': 'academic'},
            'digitalarchive.wilsoncenter.org': {'weight': 80, 'type': 'archive'},
            'marxists.org': {'weight': 75, 'type': 'archive'}
        }
        
        self.collected_data = []
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Academic Research Bot)'
        })
    
    def calculate_credibility_score(self, url: str, content: str, title: str = "") -> int:
        """Tính điểm tin cậy của nguồn"""
        score = 0
        domain = urlparse(url).netloc.lower()
        
        # Domain trust score
        for trusted_domain, info in self.trusted_sources.items():
            if trusted_domain in domain:
                score += info['weight']
                break
        else:
            score = 10
        
        # Content quality indicators
        if self.has_citations(content):
            score += 10
        
        if self.has_official_language(content):
            score += 5
        
        if self.has_specific_dates(content):
            score += 5
            
        # Negative indicators
        if len(content) < 100:
            score -= 20
            
        if self.has_spam_indicators(content):
            score -= 30
            
        return max(0, min(100, score))
    
    def has_citations(self, text: str) -> bool:
        """Kiểm tra có citation không"""
        citation_patterns = [
            r'\(\d{4}\)',
            r'Toàn tập.*tập.*',
            r'Tuyên ngôn.*\d{4}',
            r'nguồn:',
            r'trích dẫn:'
        ]
        return any(re.search(pattern, text, re.IGNORECASE) for pattern in citation_patterns)
    
    def has_official_language(self, text: str) -> bool:
        """Kiểm tra ngôn ngữ chính thức"""
        official_terms = [
            'chủ tịch hồ chí minh',
            'tư tưởng hồ chí minh', 
            'toàn tập',
            'tuyên ngôn độc lập'
        ]
        text_lower = text.lower()
        return sum(term in text_lower for term in official_terms) >= 2
    
    def has_specific_dates(self, text: str) -> bool:
        """Có ngày tháng cụ thể"""
        date_patterns = [
            r'\d{1,2}[-/]\d{1,2}[-/]\d{4}',
            r'\d{4}',
            r'tháng \d{1,2}',
            r'năm \d{4}'
        ]
        return any(re.search(pattern, text) for pattern in date_patterns)
    
    def has_spam_indicators(self, text: str) -> bool:
        """Kiểm tra spam/low quality"""
        spam_indicators = ['click here', 'buy now', 'advertisement', 'ads']
        text_lower = text.lower()
        return any(indicator in text_lower for indicator in spam_indicators)
    
    def fetch_content(self, url: str) -> Dict:
        """Fetch và parse content từ URL"""
        try:
            response = self.session.get(url, timeout=10)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Extract main content
            content = self.extract_main_content(soup)
            title = soup.find('title')
            title_text = title.text.strip() if title else ""
            
            # Calculate credibility
            credibility = self.calculate_credibility_score(url, content, title_text)
            
            # Create content hash for deduplication
            content_hash = hashlib.md5(content.encode('utf-8')).hexdigest()
            
            return {
                'url': url,
                'title': title_text,
                'content': content,
                'credibility_score': credibility,
                'source_type': self.get_source_type(url),
                'content_hash': content_hash,
                'timestamp': time.time()
            }
            
        except Exception as e:
            print(f"Error fetching {url}: {e}")
            return None
    
    def extract_main_content(self, soup: BeautifulSoup) -> str:
        """Extract main text content"""
        # Remove script, style, nav, footer, ads
        for element in soup(['script', 'style', 'nav', 'footer', 'aside', 'header']):
            element.decompose()
        
        # Try to find main content
        main_content = soup.find('main') or soup.find('article') or soup.find('div', class_=re.compile(r'content|main|body'))
        
        if main_content:
            text = main_content.get_text(separator=' ', strip=True)
        else:
            text = soup.get_text(separator=' ', strip=True)
        
        # Clean up text
        text = re.sub(r'\s+', ' ', text)
        return text.strip()
    
    def get_source_type(self, url: str) -> str:
        """Determine source type"""
        domain = urlparse(url).netloc.lower()
        for trusted_domain, info in self.trusted_sources.items():
            if trusted_domain in domain:
                return info['type']
        return 'unknown'
    
    def collect_hcm_content(self, topics: List[str]) -> List[Dict]:
        """Thu thập nội dung về các chủ đề HCM"""
        all_results = []
        
        # URLs chính thức để test
        test_urls = [
            'https://vietnam.gov.vn/president-ho-chi-minh-68961',
            'https://historymatters.gmu.edu/d/5139/'  # Declaration of Independence
        ]
        
        for url in test_urls:
            print(f"Fetching from: {url}")
            try:
                result = self.fetch_content(url)
                if result and result['credibility_score'] >= 70:
                    all_results.append(result)
                time.sleep(2)  # Rate limiting
            except Exception as e:
                print(f"Error processing {url}: {e}")
                continue
        
        return all_results

if __name__ == "__main__":
    collector = WebDataCollector()
    results = collector.collect_hcm_content([])
    print(f"Collected {len(results)} high-quality documents")
