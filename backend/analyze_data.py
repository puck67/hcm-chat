import json
import os

# Phân tích data trong knowledge base
data_file = "simple_vector_storage/data.json"

if os.path.exists(data_file):
    with open(data_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    documents = data.get('documents', [])
    metadatas = data.get('metadatas', [])
    
    print(f"📊 PHÂN TÍCH KNOWLEDGE BASE:")
    print(f"=" * 50)
    print(f"Tổng số documents: {len(documents)}")
    print(f"Tổng số metadata: {len(metadatas)}")
    
    # Phân tích theo chương
    chapter_counts = {}
    for meta in metadatas:
        doc_name = meta.get('document', 'Unknown')
        chapter_counts[doc_name] = chapter_counts.get(doc_name, 0) + 1
    
    print(f"\n📚 PHÂN BỔ THEO CHƯƠNG:")
    for chapter, count in sorted(chapter_counts.items()):
        print(f"   {chapter}: {count} documents")
    
    print(f"\n📝 MẪU NỘI DUNG:")
    for i, doc in enumerate(documents[:5]):
        preview = doc[:100] + "..." if len(doc) > 100 else doc
        source = metadatas[i].get('document', 'Unknown') if i < len(metadatas) else 'Unknown'
        print(f"   {i+1}. [{source}] {preview}")
    
    print(f"\n🎯 CHẤT LƯỢNG:")
    avg_length = sum(len(doc) for doc in documents) / len(documents) if documents else 0
    print(f"   Độ dài trung bình: {avg_length:.0f} ký tự")
    
    # Kiểm tra coverage các chủ đề chính
    key_topics = ['tư tưởng', 'độc lập', 'đảng', 'nhà nước', 'dân chủ', 'xã hội chủ nghĩa']
    print(f"\n🔍 COVERAGE CHỦ ĐỀ CHÍNH:")
    for topic in key_topics:
        count = sum(1 for doc in documents if topic.lower() in doc.lower())
        print(f"   '{topic}': {count} documents")

else:
    print("❌ Không tìm thấy file data.json")
