"""
Quiz Service - Quản lý câu hỏi và kết quả kiểm tra
"""
import json
import os
from datetime import datetime
from typing import List, Dict, Any
import uuid
import hashlib

class QuizService:
    def __init__(self):
        self.quiz_dir = os.path.join(os.path.dirname(__file__), '..', '..', 'quiz_data')
        self.ensure_directories()
    
    def ensure_directories(self):
        """Tạo các thư mục cần thiết"""
        os.makedirs(self.quiz_dir, exist_ok=True)
        os.makedirs(os.path.join(self.quiz_dir, 'quizzes'), exist_ok=True)
        os.makedirs(os.path.join(self.quiz_dir, 'results'), exist_ok=True)
    
    def save_quiz(self, quiz_data: Dict[str, Any]) -> str:
        """Lưu bộ câu hỏi quiz"""
        quiz_id = str(uuid.uuid4())
        quiz_data['id'] = quiz_id
        quiz_data['created_at'] = datetime.now().isoformat()
        
        file_path = os.path.join(self.quiz_dir, 'quizzes', f'{quiz_id}.json')
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(quiz_data, f, ensure_ascii=False, indent=2)
        
        return quiz_id
    
    def get_quiz(self, quiz_id: str) -> Dict[str, Any]:
        """Lấy dữ liệu quiz theo ID"""
        file_path = os.path.join(self.quiz_dir, 'quizzes', f'{quiz_id}.json')
        if not os.path.exists(file_path):
            return None
        
        with open(file_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    
    def save_quiz_result(self, username: str, quiz_id: str, result_data: Dict[str, Any]) -> str:
        """Lưu kết quả bài làm của user"""
        result_id = str(uuid.uuid4())
        result_data.update({
            'id': result_id,
            'username': username,
            'quiz_id': quiz_id,
            'submitted_at': datetime.now().isoformat()
        })
        
        # Lưu vào file theo username
        user_file = os.path.join(self.quiz_dir, 'results', f'{username}.json')
        
        # Đọc kết quả cũ nếu có
        existing_results = []
        if os.path.exists(user_file):
            with open(user_file, 'r', encoding='utf-8') as f:
                existing_results = json.load(f)
        
        # Thêm kết quả mới
        existing_results.append(result_data)
        
        # Lưu lại
        with open(user_file, 'w', encoding='utf-8') as f:
            json.dump(existing_results, f, ensure_ascii=False, indent=2)
        
        return result_id
    
    def get_user_results(self, username: str, limit: int = None) -> List[Dict[str, Any]]:
        """Lấy lịch sử làm bài của user"""
        user_file = os.path.join(self.quiz_dir, 'results', f'{username}.json')
        
        if not os.path.exists(user_file):
            return []
        
        with open(user_file, 'r', encoding='utf-8') as f:
            results = json.load(f)
        
        # Sắp xếp theo thời gian mới nhất
        results.sort(key=lambda x: x.get('submitted_at', ''), reverse=True)
        
        if limit:
            return results[:limit]
        return results
    
    def get_result_detail(self, username: str, result_id: str) -> Dict[str, Any]:
        """Lấy chi tiết một bài làm"""
        results = self.get_user_results(username)
        for result in results:
            if result.get('id') == result_id:
                return result
        return None
    
    def calculate_score(self, quiz_data: Dict[str, Any], answers: Dict[str, str]) -> Dict[str, Any]:
        """Tính điểm bài làm"""
        questions = quiz_data.get('questions', [])
        total_questions = len(questions)
        correct_count = 0
        details = []
        
        for q in questions:
            question_id = q['id']
            correct_answer = q['correct_answer']
            user_answer = answers.get(question_id, '')
            is_correct = user_answer == correct_answer
            
            if is_correct:
                correct_count += 1
            
            details.append({
                'question_id': question_id,
                'question': q['question'],
                'user_answer': user_answer,
                'correct_answer': correct_answer,
                'is_correct': is_correct,
                'explanation': q.get('explanation', '')
            })
        
        score = round((correct_count / total_questions) * 10, 1) if total_questions > 0 else 0
        
        return {
            'score': score,
            'correct_count': correct_count,
            'total_questions': total_questions,
            'percentage': round((correct_count / total_questions) * 100, 1) if total_questions > 0 else 0,
            'details': details
        }
