/**
 * Gem Kingdom — reports.js
 * Parent reports & skill analysis
 * Generates structured data for parent dashboard viewing
 *
 * Exports: generateReport, getWorldBreakdown, getSkillAnalysis, getPlaytimeSummary
 */

import { LANG, WORLD_NAMES, WORLD_ICONS, loadProgress } from './config.js';

// ===== REPORT LABELS =====

const LABELS = {
  ar: { reportTitle: 'تقرير أداء الطفل', overview: 'نظرة عامة', worldProgress: 'تقدم العوالم', skills: 'تحليل المهارات', playtime: 'وقت اللعب', recommendations: 'توصيات', totalStars: 'إجمالي النجوم', totalLevels: 'المراحل المكتملة', totalCoins: 'العملات المجمعة', totalTime: 'إجمالي وقت اللعب', avgScore: 'متوسط النقاط', winRate: 'نسبة الفوز', favoriteWorld: 'العالم المفضل', strongSkill: 'أقوى مهارة', weakSkill: 'مهارة تحتاج تحسين', noData: 'لا توجد بيانات كافية بعد', matching: 'المطابقة', specials: 'الجواهر الخاصة', obstacles: 'تحطيم العوائق', combos: 'الكومبو', planning: 'التخطيط', speed: 'السرعة', boss: 'معارك الوحوش', excellent: 'ممتاز', good: 'جيد', developing: 'قيد التطوير', needsPractice: 'يحتاج تدريب', minutes: 'دقيقة', hours: 'ساعة', today: 'اليوم', thisWeek: 'هذا الأسبوع', total: 'الإجمالي', completed: 'مكتمل', locked: 'مقفل', stars: 'نجوم' },
  en: { reportTitle: 'Child Performance Report', overview: 'Overview', worldProgress: 'World Progress', skills: 'Skill Analysis', playtime: 'Play Time', recommendations: 'Recommendations', totalStars: 'Total Stars', totalLevels: 'Levels Completed', totalCoins: 'Total Coins', totalTime: 'Total Play Time', avgScore: 'Average Score', winRate: 'Win Rate', favoriteWorld: 'Favorite World', strongSkill: 'Strongest Skill', weakSkill: 'Needs Improvement', noData: 'Not enough data yet', matching: 'Matching', specials: 'Special Gems', obstacles: 'Obstacle Breaking', combos: 'Combos', planning: 'Planning', speed: 'Speed', boss: 'Boss Battles', excellent: 'Excellent', good: 'Good', developing: 'Developing', needsPractice: 'Needs Practice', minutes: 'minutes', hours: 'hours', today: 'Today', thisWeek: 'This Week', total: 'Total', completed: 'completed', locked: 'locked', stars: 'stars' },
  pt: { reportTitle: 'Relatório de Desempenho', overview: 'Visão Geral', worldProgress: 'Progresso dos Mundos', skills: 'Análise de Habilidades', playtime: 'Tempo de Jogo', recommendations: 'Recomendações', totalStars: 'Total de Estrelas', totalLevels: 'Fases Completadas', totalCoins: 'Total de Moedas', totalTime: 'Tempo Total de Jogo', avgScore: 'Pontuação Média', winRate: 'Taxa de Vitória', favoriteWorld: 'Mundo Favorito', strongSkill: 'Habilidade Mais Forte', weakSkill: 'Precisa Melhorar', noData: 'Dados insuficientes ainda', matching: 'Combinação', specials: 'Gemas Especiais', obstacles: 'Quebra de Obstáculos', combos: 'Combos', planning: 'Planejamento', speed: 'Velocidade', boss: 'Batalhas de Chefes', excellent: 'Excelente', good: 'Bom', developing: 'Desenvolvendo', needsPractice: 'Precisa Praticar', minutes: 'minutos', hours: 'horas', today: 'Hoje', thisWeek: 'Esta Semana', total: 'Total', completed: 'completas', locked: 'bloqueado', stars: 'estrelas' },
  es: { reportTitle: 'Informe de Rendimiento', overview: 'Resumen', worldProgress: 'Progreso de Mundos', skills: 'Análisis de Habilidades', playtime: 'Tiempo de Juego', recommendations: 'Recomendaciones', totalStars: 'Estrellas Totales', totalLevels: 'Niveles Completados', totalCoins: 'Monedas Totales', totalTime: 'Tiempo Total', avgScore: 'Puntuación Media', winRate: 'Tasa de Victoria', favoriteWorld: 'Mundo Favorito', strongSkill: 'Mayor Habilidad', weakSkill: 'Necesita Mejorar', noData: 'Sin datos suficientes', matching: 'Combinar', specials: 'Gemas Especiales', obstacles: 'Romper Obstáculos', combos: 'Combos', planning: 'Planificación', speed: 'Velocidad', boss: 'Batallas de Jefes', excellent: 'Excelente', good: 'Bueno', developing: 'En Desarrollo', needsPractice: 'Necesita Práctica', minutes: 'minutos', hours: 'horas', today: 'Hoy', thisWeek: 'Esta Semana', total: 'Total', completed: 'completado', locked: 'bloqueado', stars: 'estrellas' },
  fr: { reportTitle: 'Rapport de Performance', overview: 'Aperçu', worldProgress: 'Progrès des Mondes', skills: 'Analyse des Compétences', playtime: 'Temps de Jeu', recommendations: 'Recommandations', totalStars: 'Étoiles Totales', totalLevels: 'Niveaux Complétés', totalCoins: 'Pièces Totales', totalTime: 'Temps Total', avgScore: 'Score Moyen', winRate: 'Taux de Victoire', favoriteWorld: 'Monde Favori', strongSkill: 'Meilleure Compétence', weakSkill: 'À Améliorer', noData: 'Pas assez de données', matching: 'Combinaison', specials: 'Gemmes Spéciales', obstacles: 'Briser les Obstacles', combos: 'Combos', planning: 'Planification', speed: 'Vitesse', boss: 'Combats de Boss', excellent: 'Excellent', good: 'Bon', developing: 'En Développement', needsPractice: 'À Pratiquer', minutes: 'minutes', hours: 'heures', today: 'Aujourd\'hui', thisWeek: 'Cette Semaine', total: 'Total', completed: 'complété', locked: 'verrouillé', stars: 'étoiles' },
  de: { reportTitle: 'Leistungsbericht', overview: 'Überblick', worldProgress: 'Weltfortschritt', skills: 'Kompetenzanalyse', playtime: 'Spielzeit', recommendations: 'Empfehlungen', totalStars: 'Sterne Gesamt', totalLevels: 'Abgeschlossene Level', totalCoins: 'Münzen Gesamt', totalTime: 'Gesamtspielzeit', avgScore: 'Durchschnittspunktzahl', winRate: 'Gewinnrate', favoriteWorld: 'Lieblingswelt', strongSkill: 'Stärkste Fähigkeit', weakSkill: 'Verbesserungsbedarf', noData: 'Noch nicht genug Daten', matching: 'Kombinieren', specials: 'Spezial-Edelsteine', obstacles: 'Hindernisse Brechen', combos: 'Kombos', planning: 'Planung', speed: 'Geschwindigkeit', boss: 'Bosskämpfe', excellent: 'Ausgezeichnet', good: 'Gut', developing: 'In Entwicklung', needsPractice: 'Übung Nötig', minutes: 'Minuten', hours: 'Stunden', today: 'Heute', thisWeek: 'Diese Woche', total: 'Gesamt', completed: 'abgeschlossen', locked: 'gesperrt', stars: 'Sterne' },
  it: { reportTitle: 'Rapporto Prestazioni', overview: 'Panoramica', worldProgress: 'Progresso Mondi', skills: 'Analisi Abilità', playtime: 'Tempo di Gioco', recommendations: 'Raccomandazioni', totalStars: 'Stelle Totali', totalLevels: 'Livelli Completati', totalCoins: 'Monete Totali', totalTime: 'Tempo Totale', avgScore: 'Punteggio Medio', winRate: 'Tasso Vittoria', favoriteWorld: 'Mondo Preferito', strongSkill: 'Abilità Migliore', weakSkill: 'Da Migliorare', noData: 'Dati insufficienti', matching: 'Combinazione', specials: 'Gemme Speciali', obstacles: 'Rompere Ostacoli', combos: 'Combo', planning: 'Pianificazione', speed: 'Velocità', boss: 'Battaglie Boss', excellent: 'Eccellente', good: 'Buono', developing: 'In Sviluppo', needsPractice: 'Serve Pratica', minutes: 'minuti', hours: 'ore', today: 'Oggi', thisWeek: 'Questa Settimana', total: 'Totale', completed: 'completato', locked: 'bloccato', stars: 'stelle' },
  ru: { reportTitle: 'Отчёт об Успеваемости', overview: 'Обзор', worldProgress: 'Прогресс Миров', skills: 'Анализ Навыков', playtime: 'Время Игры', recommendations: 'Рекомендации', totalStars: 'Всего Звёзд', totalLevels: 'Пройдено Уровней', totalCoins: 'Всего Монет', totalTime: 'Общее Время', avgScore: 'Средний Балл', winRate: 'Процент Побед', favoriteWorld: 'Любимый Мир', strongSkill: 'Сильный Навык', weakSkill: 'Нужно Улучшить', noData: 'Недостаточно данных', matching: 'Сопоставление', specials: 'Особые Камни', obstacles: 'Разрушение Преград', combos: 'Комбо', planning: 'Планирование', speed: 'Скорость', boss: 'Бои с Боссами', excellent: 'Отлично', good: 'Хорошо', developing: 'Развивается', needsPractice: 'Нужна Практика', minutes: 'минут', hours: 'часов', today: 'Сегодня', thisWeek: 'На Этой Неделе', total: 'Итого', completed: 'пройдено', locked: 'заблокировано', stars: 'звёзд' },
  zh: { reportTitle: '学习表现报告', overview: '概览', worldProgress: '世界进度', skills: '技能分析', playtime: '游戏时长', recommendations: '建议', totalStars: '总星数', totalLevels: '完成关卡', totalCoins: '总金币', totalTime: '总时长', avgScore: '平均分', winRate: '胜率', favoriteWorld: '最爱世界', strongSkill: '最强技能', weakSkill: '待提高', noData: '数据不足', matching: '匹配', specials: '特殊宝石', obstacles: '破坏障碍', combos: '连击', planning: '规划', speed: '速度', boss: 'Boss战', excellent: '优秀', good: '良好', developing: '发展中', needsPractice: '需练习', minutes: '分钟', hours: '小时', today: '今天', thisWeek: '本周', total: '总计', completed: '完成', locked: '未解锁', stars: '星' },
  ja: { reportTitle: '成績レポート', overview: '概要', worldProgress: 'ワールド進捗', skills: 'スキル分析', playtime: 'プレイ時間', recommendations: 'おすすめ', totalStars: '総スター数', totalLevels: 'クリアレベル', totalCoins: '総コイン', totalTime: '総プレイ時間', avgScore: '平均スコア', winRate: '勝率', favoriteWorld: 'お気に入り', strongSkill: '得意スキル', weakSkill: '改善が必要', noData: 'データ不足', matching: 'マッチング', specials: '特殊ジェム', obstacles: '障害物破壊', combos: 'コンボ', planning: '計画', speed: 'スピード', boss: 'ボス戦', excellent: '優秀', good: '良い', developing: '成長中', needsPractice: '練習が必要', minutes: '分', hours: '時間', today: '今日', thisWeek: '今週', total: '合計', completed: 'クリア', locked: 'ロック中', stars: 'スター' },
  ko: { reportTitle: '학습 성적 보고서', overview: '개요', worldProgress: '월드 진행', skills: '스킬 분석', playtime: '플레이 시간', recommendations: '추천', totalStars: '총 별', totalLevels: '클리어 레벨', totalCoins: '총 코인', totalTime: '총 시간', avgScore: '평균 점수', winRate: '승률', favoriteWorld: '인기 월드', strongSkill: '강점 스킬', weakSkill: '개선 필요', noData: '데이터 부족', matching: '매칭', specials: '특수 보석', obstacles: '장애물 파괴', combos: '콤보', planning: '계획', speed: '속도', boss: '보스전', excellent: '훌륭함', good: '좋음', developing: '성장 중', needsPractice: '연습 필요', minutes: '분', hours: '시간', today: '오늘', thisWeek: '이번 주', total: '합계', completed: '완료', locked: '잠김', stars: '별' },
  hi: { reportTitle: 'प्रदर्शन रिपोर्ट', overview: 'अवलोकन', worldProgress: 'दुनिया की प्रगति', skills: 'कौशल विश्लेषण', playtime: 'खेल का समय', recommendations: 'सुझाव', totalStars: 'कुल तारे', totalLevels: 'पूर्ण स्तर', totalCoins: 'कुल सिक्के', totalTime: 'कुल समय', avgScore: 'औसत स्कोर', winRate: 'जीत दर', favoriteWorld: 'पसंदीदा दुनिया', strongSkill: 'मजबूत कौशल', weakSkill: 'सुधार आवश्यक', noData: 'पर्याप्त डेटा नहीं', matching: 'मिलान', specials: 'विशेष रत्न', obstacles: 'बाधा तोड़ना', combos: 'कॉम्बो', planning: 'योजना', speed: 'गति', boss: 'बॉस लड़ाई', excellent: 'उत्कृष्ट', good: 'अच्छा', developing: 'विकासशील', needsPractice: 'अभ्यास ज़रूरी', minutes: 'मिनट', hours: 'घंटे', today: 'आज', thisWeek: 'इस सप्ताह', total: 'कुल', completed: 'पूर्ण', locked: 'लॉक', stars: 'तारे' },
  tr: { reportTitle: 'Performans Raporu', overview: 'Genel Bakış', worldProgress: 'Dünya İlerlemesi', skills: 'Beceri Analizi', playtime: 'Oyun Süresi', recommendations: 'Öneriler', totalStars: 'Toplam Yıldız', totalLevels: 'Tamamlanan Seviyeler', totalCoins: 'Toplam Jeton', totalTime: 'Toplam Süre', avgScore: 'Ortalama Puan', winRate: 'Kazanma Oranı', favoriteWorld: 'Favori Dünya', strongSkill: 'En Güçlü Beceri', weakSkill: 'Geliştirilmeli', noData: 'Yeterli veri yok', matching: 'Eşleştirme', specials: 'Özel Taşlar', obstacles: 'Engel Kırma', combos: 'Kombolar', planning: 'Planlama', speed: 'Hız', boss: 'Patron Savaşları', excellent: 'Mükemmel', good: 'İyi', developing: 'Gelişiyor', needsPractice: 'Pratik Gerekli', minutes: 'dakika', hours: 'saat', today: 'Bugün', thisWeek: 'Bu Hafta', total: 'Toplam', completed: 'tamamlandı', locked: 'kilitli', stars: 'yıldız' },
  nl: { reportTitle: 'Prestatierapport', overview: 'Overzicht', worldProgress: 'Wereldvoortgang', skills: 'Vaardigheidsanalyse', playtime: 'Speeltijd', recommendations: 'Aanbevelingen', totalStars: 'Totaal Sterren', totalLevels: 'Voltooide Levels', totalCoins: 'Totaal Munten', totalTime: 'Totale Speeltijd', avgScore: 'Gemiddelde Score', winRate: 'Winstpercentage', favoriteWorld: 'Favoriete Wereld', strongSkill: 'Sterkste Vaardigheid', weakSkill: 'Verbetering Nodig', noData: 'Onvoldoende gegevens', matching: 'Matchen', specials: 'Speciale Edelstenen', obstacles: 'Obstakels Breken', combos: 'Combo\'s', planning: 'Planning', speed: 'Snelheid', boss: 'Bossgevechten', excellent: 'Uitstekend', good: 'Goed', developing: 'In Ontwikkeling', needsPractice: 'Oefening Nodig', minutes: 'minuten', hours: 'uren', today: 'Vandaag', thisWeek: 'Deze Week', total: 'Totaal', completed: 'voltooid', locked: 'vergrendeld', stars: 'sterren' },
  sv: { reportTitle: 'Prestationsrapport', overview: 'Översikt', worldProgress: 'Världsframsteg', skills: 'Färdighetsanalys', playtime: 'Speltid', recommendations: 'Rekommendationer', totalStars: 'Totalt Stjärnor', totalLevels: 'Avklarade Nivåer', totalCoins: 'Totalt Mynt', totalTime: 'Total Speltid', avgScore: 'Genomsnittspoäng', winRate: 'Vinstprocent', favoriteWorld: 'Favoritvärld', strongSkill: 'Starkaste Färdighet', weakSkill: 'Behöver Förbättras', noData: 'Otillräckliga data', matching: 'Matchning', specials: 'Specialstenar', obstacles: 'Hinderkrossning', combos: 'Kombos', planning: 'Planering', speed: 'Hastighet', boss: 'Bossstrider', excellent: 'Utmärkt', good: 'Bra', developing: 'Under Utveckling', needsPractice: 'Behöver Övning', minutes: 'minuter', hours: 'timmar', today: 'Idag', thisWeek: 'Denna Vecka', total: 'Totalt', completed: 'klar', locked: 'låst', stars: 'stjärnor' },
  pl: { reportTitle: 'Raport Wyników', overview: 'Przegląd', worldProgress: 'Postęp Światów', skills: 'Analiza Umiejętności', playtime: 'Czas Gry', recommendations: 'Zalecenia', totalStars: 'Razem Gwiazdek', totalLevels: 'Ukończone Poziomy', totalCoins: 'Razem Monet', totalTime: 'Łączny Czas', avgScore: 'Średni Wynik', winRate: 'Współczynnik Wygranych', favoriteWorld: 'Ulubiony Świat', strongSkill: 'Najsilniejsza Umiejętność', weakSkill: 'Do Poprawy', noData: 'Za mało danych', matching: 'Dopasowanie', specials: 'Specjalne Klejnoty', obstacles: 'Łamanie Przeszkód', combos: 'Kombo', planning: 'Planowanie', speed: 'Szybkość', boss: 'Walki z Bossami', excellent: 'Doskonały', good: 'Dobry', developing: 'W Rozwoju', needsPractice: 'Potrzebuje Ćwiczeń', minutes: 'minut', hours: 'godzin', today: 'Dziś', thisWeek: 'Ten Tydzień', total: 'Razem', completed: 'ukończono', locked: 'zablokowany', stars: 'gwiazdek' },
  uk: { reportTitle: 'Звіт Успішності', overview: 'Огляд', worldProgress: 'Прогрес Світів', skills: 'Аналіз Навичок', playtime: 'Час Гри', recommendations: 'Рекомендації', totalStars: 'Всього Зірок', totalLevels: 'Пройдено Рівнів', totalCoins: 'Всього Монет', totalTime: 'Загальний Час', avgScore: 'Середній Бал', winRate: 'Відсоток Перемог', favoriteWorld: 'Улюблений Світ', strongSkill: 'Сильна Навичка', weakSkill: 'Потрібно Покращити', noData: 'Недостатньо даних', matching: 'Зіставлення', specials: 'Особливі Каміння', obstacles: 'Руйнування Перешкод', combos: 'Комбо', planning: 'Планування', speed: 'Швидкість', boss: 'Бої з Босами', excellent: 'Відмінно', good: 'Добре', developing: 'Розвивається', needsPractice: 'Потрібна Практика', minutes: 'хвилин', hours: 'годин', today: 'Сьогодні', thisWeek: 'Цього Тижня', total: 'Разом', completed: 'завершено', locked: 'заблоковано', stars: 'зірок' },
  id: { reportTitle: 'Laporan Kinerja', overview: 'Ikhtisar', worldProgress: 'Kemajuan Dunia', skills: 'Analisis Keterampilan', playtime: 'Waktu Bermain', recommendations: 'Saran', totalStars: 'Total Bintang', totalLevels: 'Level Selesai', totalCoins: 'Total Koin', totalTime: 'Total Waktu', avgScore: 'Skor Rata-rata', winRate: 'Rasio Menang', favoriteWorld: 'Dunia Favorit', strongSkill: 'Keahlian Terkuat', weakSkill: 'Perlu Ditingkatkan', noData: 'Data belum cukup', matching: 'Mencocokkan', specials: 'Permata Khusus', obstacles: 'Memecahkan Rintangan', combos: 'Kombo', planning: 'Perencanaan', speed: 'Kecepatan', boss: 'Pertarungan Bos', excellent: 'Sangat Baik', good: 'Baik', developing: 'Berkembang', needsPractice: 'Perlu Latihan', minutes: 'menit', hours: 'jam', today: 'Hari Ini', thisWeek: 'Minggu Ini', total: 'Total', completed: 'selesai', locked: 'terkunci', stars: 'bintang' },
  ms: { reportTitle: 'Laporan Prestasi', overview: 'Gambaran Keseluruhan', worldProgress: 'Kemajuan Dunia', skills: 'Analisis Kemahiran', playtime: 'Masa Bermain', recommendations: 'Cadangan', totalStars: 'Jumlah Bintang', totalLevels: 'Tahap Selesai', totalCoins: 'Jumlah Syiling', totalTime: 'Jumlah Masa', avgScore: 'Skor Purata', winRate: 'Kadar Menang', favoriteWorld: 'Dunia Kegemaran', strongSkill: 'Kemahiran Terkuat', weakSkill: 'Perlu Diperbaiki', noData: 'Data tidak mencukupi', matching: 'Padanan', specials: 'Permata Khas', obstacles: 'Pecahkan Halangan', combos: 'Kombo', planning: 'Perancangan', speed: 'Kelajuan', boss: 'Pertarungan Bos', excellent: 'Cemerlang', good: 'Baik', developing: 'Berkembang', needsPractice: 'Perlu Latihan', minutes: 'minit', hours: 'jam', today: 'Hari Ini', thisWeek: 'Minggu Ini', total: 'Jumlah', completed: 'selesai', locked: 'terkunci', stars: 'bintang' },
  th: { reportTitle: 'รายงานผลงาน', overview: 'ภาพรวม', worldProgress: 'ความก้าวหน้าของโลก', skills: 'วิเคราะห์ทักษะ', playtime: 'เวลาเล่น', recommendations: 'คำแนะนำ', totalStars: 'ดาวทั้งหมด', totalLevels: 'ด่านที่ผ่าน', totalCoins: 'เหรียญทั้งหมด', totalTime: 'เวลารวม', avgScore: 'คะแนนเฉลี่ย', winRate: 'อัตราชนะ', favoriteWorld: 'โลกโปรด', strongSkill: 'ทักษะเด่น', weakSkill: 'ต้องปรับปรุง', noData: 'ข้อมูลยังไม่เพียงพอ', matching: 'จับคู่', specials: 'อัญมณีพิเศษ', obstacles: 'ทำลายสิ่งกีดขวาง', combos: 'คอมโบ', planning: 'วางแผน', speed: 'ความเร็ว', boss: 'ต่อสู้บอส', excellent: 'ยอดเยี่ยม', good: 'ดี', developing: 'กำลังพัฒนา', needsPractice: 'ต้องฝึก', minutes: 'นาที', hours: 'ชั่วโมง', today: 'วันนี้', thisWeek: 'สัปดาห์นี้', total: 'รวม', completed: 'เสร็จ', locked: 'ล็อค', stars: 'ดาว' },
  vi: { reportTitle: 'Báo Cáo Thành Tích', overview: 'Tổng Quan', worldProgress: 'Tiến Trình Thế Giới', skills: 'Phân Tích Kỹ Năng', playtime: 'Thời Gian Chơi', recommendations: 'Đề Xuất', totalStars: 'Tổng Sao', totalLevels: 'Màn Hoàn Thành', totalCoins: 'Tổng Xu', totalTime: 'Tổng Thời Gian', avgScore: 'Điểm Trung Bình', winRate: 'Tỷ Lệ Thắng', favoriteWorld: 'Thế Giới Yêu Thích', strongSkill: 'Kỹ Năng Mạnh', weakSkill: 'Cần Cải Thiện', noData: 'Chưa đủ dữ liệu', matching: 'Ghép Đôi', specials: 'Đá Quý Đặc Biệt', obstacles: 'Phá Chướng Ngại', combos: 'Combo', planning: 'Lập Kế Hoạch', speed: 'Tốc Độ', boss: 'Đánh Boss', excellent: 'Xuất Sắc', good: 'Tốt', developing: 'Đang Phát Triển', needsPractice: 'Cần Luyện Tập', minutes: 'phút', hours: 'giờ', today: 'Hôm Nay', thisWeek: 'Tuần Này', total: 'Tổng', completed: 'hoàn thành', locked: 'khóa', stars: 'sao' },
  fa: { reportTitle: 'گزارش عملکرد', overview: 'نمای کلی', worldProgress: 'پیشرفت جهان‌ها', skills: 'تحلیل مهارت', playtime: 'زمان بازی', recommendations: 'پیشنهادات', totalStars: 'مجموع ستاره‌ها', totalLevels: 'مراحل تمام‌شده', totalCoins: 'مجموع سکه‌ها', totalTime: 'زمان کل', avgScore: 'امتیاز میانگین', winRate: 'نرخ پیروزی', favoriteWorld: 'جهان محبوب', strongSkill: 'قوی‌ترین مهارت', weakSkill: 'نیاز به بهبود', noData: 'داده کافی نیست', matching: 'تطبیق', specials: 'سنگ‌های ویژه', obstacles: 'شکستن موانع', combos: 'کمبو', planning: 'برنامه‌ریزی', speed: 'سرعت', boss: 'نبرد باس', excellent: 'عالی', good: 'خوب', developing: 'در حال رشد', needsPractice: 'نیاز به تمرین', minutes: 'دقیقه', hours: 'ساعت', today: 'امروز', thisWeek: 'این هفته', total: 'مجموع', completed: 'تمام‌شده', locked: 'قفل', stars: 'ستاره' },
  ur: { reportTitle: 'کارکردگی رپورٹ', overview: 'جائزہ', worldProgress: 'دنیا کی ترقی', skills: 'مہارت تجزیہ', playtime: 'کھیل کا وقت', recommendations: 'سفارشات', totalStars: 'کل ستارے', totalLevels: 'مکمل مراحل', totalCoins: 'کل سکے', totalTime: 'کل وقت', avgScore: 'اوسط اسکور', winRate: 'جیت کی شرح', favoriteWorld: 'پسندیدہ دنیا', strongSkill: 'مضبوط مہارت', weakSkill: 'بہتری ضروری', noData: 'کافی ڈیٹا نہیں', matching: 'ملاپ', specials: 'خاص جواہرات', obstacles: 'رکاوٹیں توڑنا', combos: 'کومبو', planning: 'منصوبہ بندی', speed: 'رفتار', boss: 'باس جنگ', excellent: 'بہترین', good: 'اچھا', developing: 'ترقی پذیر', needsPractice: 'مشق ضروری', minutes: 'منٹ', hours: 'گھنٹے', today: 'آج', thisWeek: 'اس ہفتے', total: 'کل', completed: 'مکمل', locked: 'مقفل', stars: 'ستارے' },
  bn: { reportTitle: 'পারফরম্যান্স রিপোর্ট', overview: 'সারসংক্ষেপ', worldProgress: 'বিশ্ব অগ্রগতি', skills: 'দক্ষতা বিশ্লেষণ', playtime: 'খেলার সময়', recommendations: 'সুপারিশ', totalStars: 'মোট তারা', totalLevels: 'সম্পন্ন লেভেল', totalCoins: 'মোট কয়েন', totalTime: 'মোট সময়', avgScore: 'গড় স্কোর', winRate: 'জয় হার', favoriteWorld: 'প্রিয় বিশ্ব', strongSkill: 'শক্তিশালী দক্ষতা', weakSkill: 'উন্নতি প্রয়োজন', noData: 'পর্যাপ্ত ডেটা নেই', matching: 'মিলানো', specials: 'বিশেষ রত্ন', obstacles: 'বাধা ভাঙা', combos: 'কম্বো', planning: 'পরিকল্পনা', speed: 'গতি', boss: 'বস যুদ্ধ', excellent: 'চমৎকার', good: 'ভালো', developing: 'বিকাশমান', needsPractice: 'অনুশীলন দরকার', minutes: 'মিনিট', hours: 'ঘণ্টা', today: 'আজ', thisWeek: 'এই সপ্তাহ', total: 'মোট', completed: 'সম্পন্ন', locked: 'লক', stars: 'তারা' },
  sw: { reportTitle: 'Ripoti ya Utendaji', overview: 'Muhtasari', worldProgress: 'Maendeleo ya Dunia', skills: 'Uchambuzi wa Ujuzi', playtime: 'Muda wa Kucheza', recommendations: 'Mapendekezo', totalStars: 'Nyota Jumla', totalLevels: 'Viwango Vilivyokamilika', totalCoins: 'Sarafu Jumla', totalTime: 'Muda Jumla', avgScore: 'Wastani wa Alama', winRate: 'Kiwango cha Ushindi', favoriteWorld: 'Dunia Pendwa', strongSkill: 'Ujuzi Hodari', weakSkill: 'Inahitaji Kuboresha', noData: 'Data haitoshi', matching: 'Kulinganisha', specials: 'Vito Maalum', obstacles: 'Kuvunja Vizuizi', combos: 'Kombo', planning: 'Kupanga', speed: 'Kasi', boss: 'Mapambano na Bosi', excellent: 'Bora', good: 'Nzuri', developing: 'Inakua', needsPractice: 'Inahitaji Mazoezi', minutes: 'dakika', hours: 'masaa', today: 'Leo', thisWeek: 'Wiki Hii', total: 'Jumla', completed: 'imekamilika', locked: 'imefungwa', stars: 'nyota' },
};

// ===== SKILL DIMENSION LABELS =====

const SKILL_KEYS = ['matching', 'specials', 'obstacles', 'combos', 'planning', 'speed', 'boss'];

function getSkillLabel(key) {
  return (LABELS[LANG] || LABELS.en)[key] || key;
}

function getRatingLabel(rating) {
  const t = LABELS[LANG] || LABELS.en;
  if (rating >= 80) return t.excellent;
  if (rating >= 60) return t.good;
  if (rating >= 40) return t.developing;
  return t.needsPractice;
}

// ===== MAIN REPORT GENERATOR =====

/**
 * Generate a full parent-facing report
 * @param {Object} [progressOverride] - Optional progress object (if null, reads from storage)
 * @returns {Object} Structured report data
 */
export function generateReport(progressOverride) {
  const progress = progressOverride || loadProgress();
  const t = LABELS[LANG] || LABELS.en;
  const dda = progress?._dda || {};

  // Compute overview stats
  let totalStars = 0;
  let levelsCompleted = 0;
  let worldStars = [];

  for (let w = 0; w < 10; w++) {
    let ws = 0;
    for (let l = 0; l < 10; l++) {
      const s = progress?.worlds?.[w]?.stars?.[l] || 0;
      if (s > 0) levelsCompleted++;
      ws += s;
    }
    worldStars.push(ws);
    totalStars += ws;
  }

  const totalGames = dda.totalGames || 0;
  const wins = dda.consecutiveWins || 0; // approximate
  const avgScore = dda.sessionScores?.length > 0
    ? Math.round(dda.sessionScores.reduce((a, b) => a + b, 0) / dda.sessionScores.length)
    : 0;

  // Favorite world (most stars)
  let favWorld = 0;
  let maxWS = 0;
  worldStars.forEach((s, i) => {
    if (s > maxWS) { maxWS = s; favWorld = i; }
  });

  // Skills
  const skillReport = getSkillAnalysis(progress);

  // Find strongest and weakest
  let strongestSkill = null;
  let weakestSkill = null;
  let maxRating = -1;
  let minRating = 101;

  for (const sk of skillReport) {
    if (sk.rating > maxRating) { maxRating = sk.rating; strongestSkill = sk; }
    if (sk.rating < minRating && sk.samples > 0) { minRating = sk.rating; weakestSkill = sk; }
  }

  // Recommendations
  const recommendations = getRecommendations(progress, skillReport);

  return {
    title: t.reportTitle,
    generatedAt: new Date().toISOString(),
    overview: {
      totalStars: { label: t.totalStars, value: totalStars, icon: '⭐' },
      levelsCompleted: { label: t.totalLevels, value: levelsCompleted, max: 100, icon: '🎮' },
      totalCoins: { label: t.totalCoins, value: progress?.coins || 0, icon: '🪙' },
      avgScore: { label: t.avgScore, value: avgScore, icon: '🏅' },
      favoriteWorld: {
        label: t.favoriteWorld,
        value: (WORLD_NAMES?.[LANG]?.[favWorld]) || `World ${favWorld + 1}`,
        icon: WORLD_ICONS?.[favWorld] || '🌍',
      },
      strongSkill: strongestSkill
        ? { label: t.strongSkill, value: strongestSkill.label, icon: '💪' }
        : null,
      weakSkill: weakestSkill
        ? { label: t.weakSkill, value: weakestSkill.label, icon: '📚' }
        : null,
    },
    worldBreakdown: getWorldBreakdown(progress),
    skills: skillReport,
    recommendations,
  };
}

// ===== WORLD BREAKDOWN =====

/**
 * Get per-world progress breakdown
 * @param {Object} progress
 * @returns {Array} [{worldIdx, name, icon, stars, maxStars, levelsComplete, isUnlocked}]
 */
export function getWorldBreakdown(progress) {
  const t = LABELS[LANG] || LABELS.en;
  const results = [];

  let cumulativeStars = 0;

  for (let w = 0; w < 10; w++) {
    let stars = 0;
    let complete = 0;

    for (let l = 0; l < 10; l++) {
      const s = progress?.worlds?.[w]?.stars?.[l] || 0;
      stars += s;
      if (s > 0) complete++;
    }

    const isUnlocked = w === 0 || cumulativeStars >= w * 15;

    results.push({
      worldIdx: w,
      name: (WORLD_NAMES?.[LANG]?.[w]) || `World ${w + 1}`,
      icon: WORLD_ICONS?.[w] || '🌍',
      stars,
      maxStars: 30, // 10 levels × 3 stars
      levelsComplete: complete,
      totalLevels: 10,
      isUnlocked,
      completionPct: Math.round((complete / 10) * 100),
      starsPct: Math.round((stars / 30) * 100),
      status: complete === 10 ? t.completed : !isUnlocked ? t.locked : `${complete}/10`,
    });

    cumulativeStars += stars;
  }

  return results;
}

// ===== SKILL ANALYSIS =====

/**
 * Get detailed skill analysis
 * @param {Object} progress
 * @returns {Array} [{key, label, rating, ratingLabel, trend, samples}]
 */
export function getSkillAnalysis(progress) {
  const dda = progress?._dda || {};
  const skills = dda.skills || {};

  return SKILL_KEYS.map(key => {
    const s = skills[key] || { rating: 50, trend: 0, samples: 0 };
    return {
      key,
      label: getSkillLabel(key),
      rating: s.rating || 50,
      ratingLabel: getRatingLabel(s.rating || 50),
      trend: s.trend || 0,
      trendIcon: s.trend > 2 ? '📈' : s.trend < -2 ? '📉' : '➡️',
      samples: s.samples || 0,
    };
  });
}

// ===== PLAYTIME SUMMARY =====

/**
 * Get playtime summary from progress
 * @param {Object} progress
 * @returns {Object} {totalMinutes, sessionsCount, avgSessionMin}
 */
export function getPlaytimeSummary(progress) {
  const dda = progress?._dda || {};
  const totalGames = dda.totalGames || 0;
  // Estimate: ~2 minutes per game on average
  const estimatedMinutes = totalGames * 2;

  return {
    totalMinutes: estimatedMinutes,
    totalFormatted: estimatedMinutes >= 60
      ? `${Math.floor(estimatedMinutes / 60)}h ${estimatedMinutes % 60}m`
      : `${estimatedMinutes}m`,
    totalGames,
    avgGameMinutes: totalGames > 0 ? 2 : 0,
  };
}

// ===== RECOMMENDATIONS =====

function getRecommendations(progress, skillReport) {
  const recs = [];

  const weakSkills = skillReport
    .filter(s => s.samples > 0 && s.rating < 40)
    .sort((a, b) => a.rating - b.rating);

  const strongSkills = skillReport
    .filter(s => s.rating >= 70)
    .sort((a, b) => b.rating - a.rating);

  const dda = progress?._dda || {};

  // Recommendation: practice weak skills
  if (weakSkills.length > 0) {
    const sep = LANG === 'ar' ? '، ' : ', ';
    const labels = weakSkills.map(s => s.label).join(sep);
    const prefixes = { ar: 'ينصح بالتركيز على تحسين', en: 'Recommended to practice', pt: 'Recomendado praticar', es: 'Se recomienda practicar', fr: 'Recommandé de pratiquer', de: 'Empfohlen zu üben', it: 'Consigliato praticare', ru: 'Рекомендуется практиковать', zh: '建议练习', ja: '練習をおすすめ', ko: '연습 추천', hi: 'अभ्यास की सलाह', tr: 'Pratik önerilir', nl: 'Aanbevolen te oefenen', sv: 'Rekommenderat att öva', pl: 'Zalecane ćwiczenie', uk: 'Рекомендовано практикувати', id: 'Disarankan untuk berlatih', ms: 'Disyorkan untuk berlatih', th: 'แนะนำให้ฝึก', vi: 'Khuyên luyện tập', fa: 'توصیه به تمرین', ur: 'مشق کی سفارش', bn: 'অনুশীলন সুপারিশ', sw: 'Inapendekezwa kufanya mazoezi' };
    const prefix = prefixes[LANG] || prefixes.en;
    recs.push({ icon: '📚', text: `${prefix}: ${labels}`, priority: 'high' });
  }

  // Recommendation: celebrate strengths
  if (strongSkills.length > 0) {
    const sep = LANG === 'ar' ? '، ' : ', ';
    const labels = strongSkills.map(s => s.label).join(sep);
    const prefixes = { ar: 'مهارة متميزة في', en: 'Excelling in', pt: 'Destaque em', es: 'Destacado en', fr: 'Excellent en', de: 'Hervorragend in', it: 'Eccellente in', ru: 'Отличный результат в', zh: '擅长', ja: '得意分野', ko: '뛰어난 능력', hi: 'उत्कृष्ट कौशल', tr: 'Üstün beceri', nl: 'Uitblinkend in', sv: 'Utmärkt i', pl: 'Wybitny w', uk: 'Відмінно в', id: 'Unggul dalam', ms: 'Cemerlang dalam', th: 'เก่งใน', vi: 'Xuất sắc về', fa: 'برتری در', ur: 'بہترین مہارت', bn: 'দক্ষতায় সেরা', sw: 'Bora katika' };
    const prefix = prefixes[LANG] || prefixes.en;
    recs.push({ icon: '⭐', text: `${prefix}: ${labels}`, priority: 'info' });
  }

  // Recommendation: frustration detection
  if ((dda.consecutiveFails || 0) >= 3) {
    const frustTexts = { ar: 'الطفل يواجه صعوبة — قد يحتاج مساعدة أو استراحة', en: 'Child is struggling — may need help or a break', pt: 'Criança está com dificuldade — pode precisar de ajuda ou pausa', es: 'El niño tiene dificultades — puede necesitar ayuda o un descanso', fr: 'L\'enfant a des difficultés — peut avoir besoin d\'aide ou d\'une pause', de: 'Kind hat Schwierigkeiten — braucht vielleicht Hilfe oder eine Pause', it: 'Il bambino è in difficoltà — potrebbe aver bisogno di aiuto o di una pausa', ru: 'Ребёнок испытывает трудности — может нуждаться в помощи или перерыве', zh: '孩子遇到困难 — 可能需要帮助或休息', ja: 'お子さんが苦戦中 — 助けや休憩が必要かも', ko: '아이가 어려움을 겪고 있습니다 — 도움이나 휴식이 필요할 수 있어요', hi: 'बच्चा कठिनाई में है — मदद या आराम की ज़रूरत हो सकती है', tr: 'Çocuk zorlanıyor — yardım veya mola gerekebilir', nl: 'Kind heeft het moeilijk — heeft misschien hulp of pauze nodig', sv: 'Barnet kämpar — kan behöva hjälp eller paus', pl: 'Dziecko ma trudności — może potrzebować pomocy lub przerwy', uk: 'Дитина має труднощі — може потребувати допомоги або перерви', id: 'Anak kesulitan — mungkin butuh bantuan atau istirahat', ms: 'Kanak-kanak menghadapi kesukaran — mungkin perlukan bantuan atau rehat', th: 'เด็กกำลังลำบาก — อาจต้องการความช่วยเหลือหรือพักผ่อน', vi: 'Trẻ đang gặp khó khăn — có thể cần giúp đỡ hoặc nghỉ ngơi', fa: 'کودک با مشکل مواجه است — ممکن است به کمک یا استراحت نیاز داشته باشد', ur: 'بچہ مشکل میں ہے — مدد یا آرام کی ضرورت ہو سکتی ہے', bn: 'শিশু কষ্ট পাচ্ছে — সাহায্য বা বিশ্রামের প্রয়োজন হতে পারে', sw: 'Mtoto anajitahidi — anaweza kuhitaji msaada au mapumziko' };
    recs.push({ icon: '⚠️', text: frustTexts[LANG] || frustTexts.en, priority: 'warning' });
  }

  // Recommendation: consistent play
  if ((dda.totalGames || 0) < 5) {
    const newTexts = { ar: 'الطفل مبتدئ — شجعه على الاستمرار!', en: 'Child is new — encourage them to keep playing!', pt: 'Criança é nova — incentive a continuar!', es: '¡El niño es nuevo — anímalo a seguir jugando!', fr: 'L\'enfant est nouveau — encouragez-le à continuer !', de: 'Kind ist neu — ermutigen Sie es weiterzuspielen!', it: 'Il bambino è nuovo — incoraggiatelo a continuare!', ru: 'Ребёнок новичок — поощряйте играть дальше!', zh: '孩子刚开始 — 鼓励继续玩！', ja: 'お子さんは初心者 — 続けるよう励まして！', ko: '아이가 아직 초보입니다 — 계속 놀도록 격려해주세요!', hi: 'बच्चा नया है — खेलते रहने के लिए प्रोत्साहित करें!', tr: 'Çocuk yeni — oynamaya devam etmesi için teşvik edin!', nl: 'Kind is nieuw — moedig aan om te blijven spelen!', sv: 'Barnet är nytt — uppmuntra att fortsätta spela!', pl: 'Dziecko jest nowe — zachęcaj do dalszej gry!', uk: 'Дитина новачок — заохочуйте грати далі!', id: 'Anak masih baru — dorong untuk terus bermain!', ms: 'Kanak-kanak masih baru — galakkan untuk terus bermain!', th: 'เด็กยังใหม่ — กระตุ้นให้เล่นต่อ!', vi: 'Trẻ mới bắt đầu — khuyến khích chơi tiếp!', fa: 'کودک تازه‌کار است — تشویقش کنید ادامه دهد!', ur: 'بچہ نیا ہے — کھیلتے رہنے کی حوصلہ افزائی کریں!', bn: 'শিশু নতুন — খেলা চালিয়ে যেতে উৎসাহিত করুন!', sw: 'Mtoto ni mpya — wahimize kuendelea kucheza!' };
    recs.push({ icon: '🌱', text: newTexts[LANG] || newTexts.en, priority: 'info' });
  }

  return recs;
}

// ===== EXPORT FOR POSTMESSAGE =====

/**
 * Create a compact report suitable for postMessage to parent app
 * @param {Object} progress
 * @returns {Object}
 */
export function createCompactReport(progress) {
  const dda = progress?._dda || {};
  const skills = dda.skills || {};

  let totalStars = 0;
  let levelsCompleted = 0;
  for (let w = 0; w < 10; w++) {
    for (let l = 0; l < 10; l++) {
      const s = progress?.worlds?.[w]?.stars?.[l] || 0;
      if (s > 0) levelsCompleted++;
      totalStars += s;
    }
  }

  return {
    type: 'gem-kingdom-report',
    totalStars,
    levelsCompleted,
    coins: progress?.coins || 0,
    totalGames: dda.totalGames || 0,
    skills: Object.fromEntries(
      SKILL_KEYS.map(k => [k, (skills[k]?.rating || 50)])
    ),
    overallSkill: Math.round(
      SKILL_KEYS.reduce((sum, k) => sum + (skills[k]?.rating || 50), 0) / SKILL_KEYS.length
    ),
  };
}

// ===== GRADE ESTIMATION =====
export function estimateGradeLevel(progress) {
  const skillReport = getSkillAnalysis(progress);
  const avgSkill = skillReport.length > 0
    ? Math.round(skillReport.reduce((s, r) => s + r.rating, 0) / skillReport.length) : 50;

  let totalStars = 0;
  let levelsCompleted = 0;
  for (let w = 0; w < 10; w++) {
    for (let l = 0; l < 10; l++) {
      const s = progress?.worlds?.[w]?.stars?.[l] || 0;
      if (s > 0) levelsCompleted++;
      totalStars += s;
    }
  }

  // Composite: skill average + progression depth
  const progressBonus = Math.min(20, levelsCompleted * 0.4);
  const composite = avgSkill * 0.7 + progressBonus + (totalStars > 100 ? 10 : totalStars * 0.1);

  if (composite >= 85) return { grade: '5+', label: 'Advanced', confidence: 'high' };
  if (composite >= 72) return { grade: '4-5', label: 'Grade 4-5', confidence: 'medium' };
  if (composite >= 58) return { grade: '3-4', label: 'Grade 3-4', confidence: 'medium' };
  if (composite >= 42) return { grade: '2-3', label: 'Grade 2-3', confidence: 'medium' };
  if (composite >= 28) return { grade: '1-2', label: 'Grade 1-2', confidence: 'medium' };
  return { grade: 'K-1', label: 'Kindergarten-1st', confidence: 'low' };
}

// ===== FULL REPORT FOR POSTMESSAGE =====
export function generateFullReport(progressOverride) {
  const progress = progressOverride || loadProgress();
  const report = generateReport(progress);
  return {
    type: 'GEM_PROGRESS_REPORT',
    timestamp: Date.now(),
    overview: report.overview,
    worldBreakdown: getWorldBreakdown(progress),
    skills: getSkillAnalysis(progress),
    playtime: getPlaytimeSummary(progress),
    gradeEstimate: estimateGradeLevel(progress),
    recommendations: report.recommendations,
  };
}