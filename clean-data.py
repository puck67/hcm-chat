#!/usr/bin/env python3
import json
import os

def clean_data_json():
    data_path = "/Users/techmax/Documents/hcm-chatbot/backend/simple_vector_storage/data.json"
    backup_path = data_path + ".backup"

    print("🧹 Đang dọn dẹp file data.json...")
    
    with open(data_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    print(f"📊 Trước: {len(data['documents'])} documents")
    
    # Backup
    os.rename(data_path, backup_path)
    
    # Remove duplicates
    seen = set()
    unique_documents = []
    unique_embeddings = []
    
    for i, doc in enumerate(data['documents']):
        if doc not in seen:
            seen.add(doc)
            unique_documents.append(doc)
            if i < len(data.get('embeddings', [])):
                unique_embeddings.append(data['embeddings'][i])
    
    clean_data = {
        "documents": unique_documents,
        "embeddings": unique_embeddings
    }
    
    with open(data_path, 'w', encoding='utf-8') as f:
        json.dump(clean_data, f, ensure_ascii=False, indent=2)
    
    old_size = os.path.getsize(backup_path)
    new_size = os.path.getsize(data_path)
    
    print(f"📊 Sau: {len(unique_documents)} documents")
    print(f"💾 Tiết kiệm: {old_size-new_size:,} bytes ({(old_size-new_size)/old_size*100:.1f}%)")
    print(f"✅ Hoàn thành!")

if __name__ == "__main__":
    clean_data_json()
