/**
 * Quiz Application - Kiểm tra kiến thức Tư tưởng Hồ Chí Minh
 */

class QuizApp {
    constructor() {
        this.API_BASE = window.PYTHON_AI_API || 'http://localhost:8000';
        this.currentQuiz = null;
        this.currentQuestionIndex = 0;
        this.userAnswers = {};
        this.startTime = null;
        this.timerInterval = null;
        this.user = null;

        this.init();
    }

    async init() {
        // Check authentication
        const userStr = localStorage.getItem('user');
        const token = localStorage.getItem('token');

        if (!userStr || !token) {
            alert('Vui lòng đăng nhập trước');
            window.location.href = 'auth.html';
            return;
        }

        this.user = JSON.parse(userStr);
        document.getElementById('username').textContent = this.user.fullName || this.user.username;

        // Setup event listeners
        this.setupEventListeners();

        // Check if quiz_id in URL (opened from chat)
        const urlParams = new URLSearchParams(window.location.search);
        const quizId = urlParams.get('quiz_id') || urlParams.get('quizid'); // Support both formats
        
        if (quizId) {
            // Load and start quiz directly
            this.loadQuizById(quizId);
        }
    }

    async loadQuizById(quizId) {
        try {
            // Show loading
            document.getElementById('quizCreation').style.display = 'none';
            document.getElementById('loadingContainer').style.display = 'block';

            const response = await fetch(`${this.API_BASE}/quiz/${quizId}`);
            if (!response.ok) throw new Error('Không tìm thấy bài kiểm tra');

            const quiz = await response.json();
            this.currentQuiz = quiz;

            // Hide loading and start quiz directly
            document.getElementById('loadingContainer').style.display = 'none';
            this.startQuiz();

        } catch (error) {
            console.error('Error loading quiz:', error);
            alert('Không thể tải bài kiểm tra. Vui lòng thử lại.');
            window.location.href = 'quiz.html';
        }
    }

    setupEventListeners() {
        // Difficulty buttons
        document.querySelectorAll('.diff-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
            });
        });
    }

    // Change question count
    changeQuestionCount(delta) {
        const input = document.getElementById('numQuestions');
        const current = parseInt(input.value) || 15;
        const newValue = Math.max(5, Math.min(30, current + delta));
        input.value = newValue;
    }

    // Generate quiz
    async generateQuiz() {
        const chapter = document.getElementById('chapterSelect').value;
        const numQuestions = parseInt(document.getElementById('numQuestions').value) || 15;
        const difficulty = document.querySelector('.diff-btn.active').dataset.difficulty || 'medium';

        if (!chapter) {
            alert('Vui lòng chọn chương');
            return;
        }

        // Show loading
        document.getElementById('quizCreation').style.display = 'block';
        document.getElementById('loadingContainer').style.display = 'block';
        document.getElementById('btnGenerate').disabled = true;
        document.getElementById('quizReady').style.display = 'none';

        try {
            const response = await fetch(`${this.API_BASE}/quiz/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    chapter: chapter,
                    num_questions: numQuestions,
                    difficulty: difficulty
                })
            });

            if (!response.ok) {
                throw new Error('Không thể tạo bài kiểm tra');
            }

            const quiz = await response.json();
            this.currentQuiz = quiz;

            // Show success
            document.getElementById('loadingContainer').style.display = 'none';
            document.getElementById('quizReady').style.display = 'block';
            document.getElementById('quizInfo').textContent = 
                `${quiz.title} - ${quiz.num_questions} câu hỏi - Độ khó: ${this.getDifficultyText(quiz.difficulty)}`;

        } catch (error) {
            console.error('Error generating quiz:', error);
            alert('Lỗi khi tạo bài kiểm tra: ' + error.message);
            document.getElementById('loadingContainer').style.display = 'none';
        } finally {
            document.getElementById('btnGenerate').disabled = false;
        }
    }

    getDifficultyText(difficulty) {
        const map = {
            'easy': 'Dễ',
            'medium': 'Trung bình',
            'hard': 'Khó'
        };
        return map[difficulty] || difficulty;
    }

    // Start quiz
    startQuiz() {
        if (!this.currentQuiz) return;

        // Hide creation section, show taking section
        document.getElementById('quizCreation').style.display = 'none';
        document.getElementById('quizTaking').style.display = 'block';

        // Setup quiz
        document.getElementById('quizTitle').textContent = this.currentQuiz.title;
        document.getElementById('quizMeta').textContent = 
            `${this.currentQuiz.num_questions} câu - ${this.getDifficultyText(this.currentQuiz.difficulty)}`;

        // Render questions
        this.renderQuestions();
        this.renderQuestionMap();
        
        // Show first question
        this.showQuestion(0);

        // Start timer
        this.startTimer();
    }

    renderQuestions() {
        const container = document.getElementById('questionContainer');
        container.innerHTML = '';

        this.currentQuiz.questions.forEach((q, index) => {
            const questionDiv = document.createElement('div');
            questionDiv.className = 'question';
            questionDiv.id = `question-${index}`;
            
            questionDiv.innerHTML = `
                <h3>Câu ${index + 1}: ${q.question}</h3>
                <div class="options">
                    ${Object.entries(q.options).map(([key, value]) => `
                        <div class="option" onclick="quizApp.selectAnswer(${index}, '${key}')">
                            <input type="radio" name="q${index}" id="q${index}_${key}" value="${key}">
                            <label for="q${index}_${key}">
                                <strong>${key}.</strong> ${value}
                            </label>
                        </div>
                    `).join('')}
                </div>
            `;
            
            container.appendChild(questionDiv);
        });
    }

    renderQuestionMap() {
        const mapContainer = document.getElementById('questionMap');
        mapContainer.innerHTML = '';

        this.currentQuiz.questions.forEach((_, index) => {
            const btn = document.createElement('button');
            btn.className = 'q-btn';
            btn.textContent = index + 1;
            btn.onclick = () => this.showQuestion(index);
            btn.id = `qmap-${index}`;
            mapContainer.appendChild(btn);
        });
    }

    selectAnswer(questionIndex, answer) {
        // Save answer
        this.userAnswers[this.currentQuiz.questions[questionIndex].id] = answer;

        // Update UI
        const options = document.querySelectorAll(`#question-${questionIndex} .option`);
        options.forEach(opt => opt.classList.remove('selected'));
        
        const selectedOption = document.querySelector(`#q${questionIndex}_${answer}`);
        if (selectedOption) {
            selectedOption.checked = true;
            selectedOption.parentElement.classList.add('selected');
        }

        // Update question map
        document.getElementById(`qmap-${questionIndex}`).classList.add('answered');

        // Update progress
        this.updateProgress();

        // Auto advance to next question after a short delay
        setTimeout(() => {
            const nextIndex = questionIndex + 1;
            if (nextIndex < this.currentQuiz.questions.length) {
                this.showQuestion(nextIndex);
            }
        }, 800); // 0.8 second delay to show selection feedback
    }

    showQuestion(index) {
        if (index < 0 || index >= this.currentQuiz.questions.length) return;

        this.currentQuestionIndex = index;

        // Hide all questions
        document.querySelectorAll('.question').forEach(q => {
            q.classList.remove('active');
        });

        // Show selected question
        document.getElementById(`question-${index}`).classList.add('active');

        // Update navigation
        document.getElementById('btnPrev').disabled = index === 0;
        document.getElementById('btnNext').disabled = index === this.currentQuiz.questions.length - 1;
        document.getElementById('questionNumber').textContent = 
            `Câu ${index + 1}/${this.currentQuiz.questions.length}`;

        // Update question map
        document.querySelectorAll('.q-btn').forEach(btn => {
            btn.classList.remove('current');
        });
        document.getElementById(`qmap-${index}`).classList.add('current');

        // Restore selected answer if any
        const questionId = this.currentQuiz.questions[index].id;
        if (this.userAnswers[questionId]) {
            const answer = this.userAnswers[questionId];
            document.getElementById(`q${index}_${answer}`).checked = true;
            document.querySelector(`#q${index}_${answer}`).parentElement.classList.add('selected');
        }
    }

    prevQuestion() {
        if (this.currentQuestionIndex > 0) {
            this.showQuestion(this.currentQuestionIndex - 1);
        }
    }

    nextQuestion() {
        if (this.currentQuestionIndex < this.currentQuiz.questions.length - 1) {
            this.showQuestion(this.currentQuestionIndex + 1);
        }
    }

    updateProgress() {
        const answered = Object.keys(this.userAnswers).length;
        const total = this.currentQuiz.questions.length;
        const percentage = (answered / total) * 100;

        document.getElementById('progressFill').style.width = percentage + '%';
        document.getElementById('progressText').textContent = `${answered}/${total}`;
    }

    startTimer() {
        this.startTime = Date.now();
        this.timerInterval = setInterval(() => {
            const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
            const minutes = Math.floor(elapsed / 60);
            const seconds = elapsed % 60;
            document.getElementById('timer').textContent = 
                `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }, 1000);
    }

    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    async submitQuiz() {
        const answered = Object.keys(this.userAnswers).length;
        const total = this.currentQuiz.questions.length;

        if (answered < total) {
            if (!confirm(`Bạn mới trả lời ${answered}/${total} câu. Bạn có chắc muốn nộp bài không?`)) {
                return;
            }
        }

        this.stopTimer();

        try {
            // Submit quiz
            const response = await fetch(`${this.API_BASE}/quiz/submit`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    quiz_id: this.currentQuiz.id,
                    username: this.user.username,
                    answers: this.userAnswers
                })
            });

            if (!response.ok) {
                throw new Error('Không thể nộp bài');
            }

            const result = await response.json();
            this.showResult(result);

        } catch (error) {
            console.error('Error submitting quiz:', error);
            alert('Lỗi khi nộp bài: ' + error.message);
        }
    }

    showResult(result) {
        // Hide taking section, show result section
        document.getElementById('quizTaking').style.display = 'none';
        document.getElementById('quizResult').style.display = 'block';

        // Animate score circle
        const scorePercentage = (result.score / 10) * 100;
        setTimeout(() => {
            const circle = document.getElementById('scoreCircle');
            const offset = 565 - (565 * scorePercentage) / 100;
            circle.style.strokeDashoffset = offset;
        }, 100);

        // Display score
        document.getElementById('scoreNumber').textContent = result.score.toFixed(1);
        document.getElementById('correctCount').textContent = result.correct_count;
        document.getElementById('wrongCount').textContent = result.total_questions - result.correct_count;
        document.getElementById('percentage').textContent = result.percentage.toFixed(1) + '%';

        // Display message based on score
        let message = '';
        let description = '';
        
        if (result.score >= 9) {
            message = 'Xuất sắc!';
            description = 'Bạn có kiến thức rất tốt về tư tưởng Hồ Chí Minh!';
        } else if (result.score >= 7) {
            message = 'Tốt!';
            description = 'Bạn nắm vững kiến thức cơ bản. Hãy tiếp tục học tập!';
        } else if (result.score >= 5) {
            message = 'Khá!';
            description = 'Bạn cần ôn tập thêm một số phần kiến thức.';
        } else {
            message = 'Cần cải thiện!';
            description = 'Hãy dành thời gian ôn tập lại kiến thức nhé!';
        }

        document.getElementById('resultMessage').textContent = message;
        document.getElementById('resultDescription').textContent = description;

        // Display answer details
        this.displayAnswerDetails(result.details);
    }

    displayAnswerDetails(details) {
        const container = document.getElementById('answerDetails');
        container.innerHTML = '';

        details.forEach((detail, index) => {
            const div = document.createElement('div');
            div.className = `answer-detail ${detail.is_correct ? 'correct' : 'wrong'}`;
            
            div.innerHTML = `
                <h4>Câu ${index + 1}: ${detail.question}</h4>
                <p>Đáp án của bạn: 
                    <span class="${detail.is_correct ? 'correct-answer' : 'wrong-answer'}">
                        ${detail.user_answer || 'Chưa trả lời'}
                    </span>
                </p>
                ${!detail.is_correct ? `
                    <p>Đáp án đúng: 
                        <span class="correct-answer">${detail.correct_answer}</span>
                    </p>
                ` : ''}
                ${detail.explanation ? `
                    <div class="explanation">
                        <strong>Giải thích:</strong> ${detail.explanation}
                    </div>
                ` : ''}
            `;
            
            container.appendChild(div);
        });
    }

    async showHistory() {
        // Hide all sections
        document.getElementById('quizCreation').style.display = 'none';
        document.getElementById('quizTaking').style.display = 'none';
        document.getElementById('quizResult').style.display = 'none';
        document.getElementById('historySection').style.display = 'block';

        try {
            const response = await fetch(`${this.API_BASE}/quiz/history/${this.user.username}?limit=20`);
            if (!response.ok) throw new Error('Không thể tải lịch sử');

            const history = await response.json();
            this.displayHistory(history);

        } catch (error) {
            console.error('Error loading history:', error);
            document.getElementById('historyContent').innerHTML = 
                '<p style="text-align: center; color: #666;">Không thể tải lịch sử làm bài</p>';
        }
    }

    displayHistory(history) {
        const container = document.getElementById('historyContent');
        
        if (!history || history.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #666;">Chưa có lịch sử làm bài</p>';
            return;
        }

        container.innerHTML = history.map(item => `
            <div class="history-item" onclick="quizApp.viewHistoryDetail('${item.id}')">
                <div class="history-info">
                    <h4>${item.quiz_title || 'Bài kiểm tra'}</h4>
                    <div class="history-meta">
                        <span><i class="fas fa-clock"></i> ${new Date(item.submitted_at).toLocaleString('vi-VN')}</span>
                        <span><i class="fas fa-check"></i> ${item.correct_count}/${item.total_questions} câu</span>
                    </div>
                </div>
                <div class="history-score">
                    <div class="score-badge">${item.score.toFixed(1)}</div>
                </div>
            </div>
        `).join('');
    }

    async viewHistoryDetail(resultId) {
        try {
            const response = await fetch(`${this.API_BASE}/quiz/result/${this.user.username}/${resultId}`);
            if (!response.ok) throw new Error('Không thể tải chi tiết');

            const result = await response.json();
            
            // Show result section with historical data
            document.getElementById('historySection').style.display = 'none';
            this.showResult(result);

        } catch (error) {
            console.error('Error loading result detail:', error);
            alert('Không thể tải chi tiết bài làm');
        }
    }

    backToQuizCreation() {
        document.getElementById('historySection').style.display = 'none';
        document.getElementById('quizCreation').style.display = 'block';
    }
}

// Global functions for HTML events
let quizApp;

window.addEventListener('DOMContentLoaded', () => {
    quizApp = new QuizApp();
});

function changeQuestionCount(delta) {
    quizApp.changeQuestionCount(delta);
}

function generateQuiz() {
    quizApp.generateQuiz();
}

function startQuiz() {
    quizApp.startQuiz();
}

function prevQuestion() {
    quizApp.prevQuestion();
}

function nextQuestion() {
    quizApp.nextQuestion();
}

function submitQuiz() {
    quizApp.submitQuiz();
}

function showHistory() {
    quizApp.showHistory();
}

function backToQuizCreation() {
    quizApp.backToQuizCreation();
}
