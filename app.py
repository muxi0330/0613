import os
import re
import uuid
import sqlite3
import datetime
import shutil
import requests as http_requests
from flask import Flask, render_template, request, jsonify, send_from_directory

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.environ.get('DATA_DIR', BASE_DIR)
DB_PATH = os.path.join(DATA_DIR, 'expenses.db')
RECEIPTS_DIR = os.path.join(DATA_DIR, 'receipts')

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = os.path.join(DATA_DIR, 'uploads')
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
os.makedirs(RECEIPTS_DIR, exist_ok=True)

OCR_SPACE_API_KEY = 'helloworld'
OCR_SPACE_API_URL = 'https://api.ocr.space/parse/image'


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    with get_db() as conn:
        conn.execute('''
            CREATE TABLE IF NOT EXISTS expenses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                amount REAL NOT NULL,
                category TEXT NOT NULL DEFAULT '其他',
                name TEXT DEFAULT '',
                description TEXT DEFAULT '',
                date TEXT NOT NULL,
                icon TEXT DEFAULT '',
                image_path TEXT DEFAULT '',
                trans_type TEXT DEFAULT 'expense',
                created_at TEXT DEFAULT (datetime('now','localtime'))
            )
        ''')
        cols = [r[1] for r in conn.execute('PRAGMA table_info(expenses)').fetchall()]
        for col in ['icon', 'image_path', 'name', 'trans_type']:
            if col not in cols:
                conn.execute(f'ALTER TABLE expenses ADD COLUMN {col} TEXT DEFAULT ""')


init_db()

CATEGORIES = ['餐饮', '交通', '购物', '娱乐', '居住', '医疗', '教育', '其他']

CATEGORY_KEYWORDS = {
    '餐饮': [
        ('餐馆', 5), ('餐厅', 5), ('饭店', 5), ('食堂', 5), ('外卖', 5),
        ('火锅', 4), ('烧烤', 4), ('奶茶', 4), ('咖啡', 4), ('饮品', 4),
        ('小吃', 3), ('快餐', 4), ('早餐', 4), ('午餐', 4), ('晚餐', 4),
        ('餐', 2), ('饭', 2), ('菜', 2), ('酒', 2), ('饮', 2),
        ('面', 1), ('粉', 1), ('饼', 1), ('肉', 1), ('鱼', 1),
        ('food', 2), ('restaurant', 2),
    ],
    '交通': [
        ('交通', 5), ('出行', 5), ('打车', 4), ('滴滴', 4), ('出租', 4),
        ('地铁', 4), ('公交', 4), ('高铁', 4), ('火车', 4), ('机票', 4),
        ('航班', 4), ('加油', 4), ('停车', 4), ('过路费', 4), ('通行费', 4),
        ('taxi', 3), ('metro', 3), ('bus', 3), ('油', 1),
    ],
    '购物': [
        ('购物', 5), ('超市', 5), ('商场', 5), ('百货', 5), ('便利店', 5),
        ('服装', 4), ('鞋', 3), ('化妆品', 4), ('电器', 4), ('数码', 4),
        ('手机', 4), ('淘宝', 4), ('京东', 4), ('拼多多', 4),
        ('日用', 2), ('购', 1), ('买', 1),
        ('shop', 2), ('mall', 2), ('buy', 2),
    ],
    '娱乐': [
        ('娱乐', 5), ('电影', 4), ('KTV', 4), ('游戏', 4),
        ('旅游', 4), ('景点', 4), ('门票', 4), ('酒吧', 4),
        ('密室', 4), ('剧本杀', 4), ('桌游', 4), ('健身', 3),
        ('movie', 2), ('game', 2), ('玩', 1),
    ],
    '居住': [
        ('房租', 5), ('物业', 5), ('水费', 4), ('电费', 4), ('燃气', 4),
        ('宽带', 4), ('维修', 4), ('家居', 4), ('装修', 4),
        ('rent', 3), ('house', 3), ('网费', 3),
    ],
    '医疗': [
        ('医疗', 5), ('医院', 5), ('门诊', 5), ('挂号', 4), ('体检', 4),
        ('药品', 5), ('药房', 5), ('诊所', 5), ('住院', 5),
        ('药', 3), ('health', 2), ('hospital', 2), ('doctor', 2),
    ],
    '教育': [
        ('教育', 5), ('课程', 4), ('培训', 4), ('学费', 5), ('报名', 4),
        ('文具', 3), ('课本', 4), ('考试', 3),
        ('书', 1), ('学', 1),
        ('book', 2), ('learn', 2), ('course', 2),
    ],
    '收入': [
        ('工资', 5), ('薪资', 5), ('薪水', 5), ('奖金', 5), ('报销', 5),
        ('兼职', 4), ('分红', 4), ('礼金', 4), ('红包', 4), ('转账', 4),
        ('退款', 4), ('提成', 4), ('津贴', 4), ('补助', 4),
        ('收入', 3), ('入账', 3), ('收款', 3),
        ('salary', 2), ('income', 2), ('bonus', 2),
    ],
}



def extract_name_for_shopping(text):
    lines = [l.strip() for l in text.split('\n') if l.strip()]

    product_patterns = [
        r'(?:商品|品名|名称|货品)\s*[：:]\s*(.+)',
    ]
    for p in product_patterns:
        m = re.search(p, text)
        if m and len(m.group(1).strip()) >= 2:
            return m.group(1).strip()[:20]

    product_lines = []
    for line in lines:
        for sep in ['x', 'X', '×', '*', 'X', '\t']:
            if sep in line:
                parts = line.split(sep)
                if len(parts) >= 2 and re.search(r'\d', parts[-1]):
                    clean = re.sub(r'[\d.]+\s*$', '', parts[0])
                    clean = re.sub(r'[¥￥]', '', clean).strip()
                    if len(clean) >= 2:
                        product_lines.append(clean)
                    break

    if product_lines:
        return '、'.join(product_lines[:3])

    price_line_patterns = []
    for line in lines:
        price_match = re.search(r'(¥|￥)?\s*(\d+\.?\d*)\s*$', line)
        if price_match:
            before_price = line[:price_match.start()].strip()
            before_price = re.sub(r'[¥￥]', '', before_price).strip()
            if 2 <= len(before_price) <= 25 and re.search(r'[\u4e00-\u9fff]', before_price):
                skip_words = ['合计', '总计', '小计', '应付', '实付', '优惠', '找零', '支付',
                              '会员', '积分', '订单', '单号', '日期', '时间', '电话', '地址',
                              '驿站', '站点', '快递', '包裹', '自提', '取货', '配送', '运费',
                              '折扣', '实收', '收款', '件数', '总价']
                if not any(w in before_price for w in skip_words):
                    price_line_patterns.append(before_price)

    if price_line_patterns:
        return '、'.join(price_line_patterns[:3])

    for line in lines:
        clean = re.sub(r'[¥￥\d. ,:：\s]+', '', line)
        if 2 <= len(clean) <= 20 and re.search(r'[\u4e00-\u9fff]', clean):
            skip_words = ['合计', '总计', '小计', '应付', '实付', '优惠', '找零', '支付', '收银',
                          '会员', '积分', '订单', '单号', '日期', '时间', '电话', '地址',
                          '驿站', '站点', '快递', '包裹', '自提', '取货', '配送', '运费',
                          '折扣', '件数', '总价', '实收', '收款', '找赎']
            if not any(w in clean for w in skip_words):
                return clean

    return ''


def extract_name_for_food(text):
    lines = [l.strip() for l in text.split('\n') if l.strip()]

    food_patterns = [
        r'(?:菜品|菜名|美食|套餐)\s*[：:]\s*(.+)',
    ]
    for p in food_patterns:
        m = re.search(p, text)
        if m and len(m.group(1).strip()) >= 2:
            return m.group(1).strip()[:20]

    food_keywords = ['面', '饭', '粉', '汤', '锅', '肉', '鱼', '虾', '鸡', '鸭', '牛', '羊',
                     '煲', '串', '饼', '饺', '包', '粥', '蛋', '菜', '丸', '豆腐',
                     '奶茶', '咖啡', '果汁', '可乐', '啤酒', '饮料', '甜品', '蛋糕',
                     '套餐', '盖浇', '炒', '煮', '蒸', '烤', '炸', '煎', '麻辣',
                     '酸菜', '宫保', '红烧', '鱼香', '蒜蓉', '糖醋']

    price_keywords = ['¥', '￥', '元', '价格', '金额', '小计']
    skip_words = ['合计', '总计', '小计', '应付', '实付', '优惠', '支付', '收银', '买单',
                  '桌号', '单号', '日期', '时间', '电话', '地址', '折扣',
                  '餐馆', '餐厅', '饭店', '食堂', '外卖', '配送', '打包', '堂食']

    food_items = []
    for line in lines:
        if any(w in line for w in skip_words):
            continue

        for fk in food_keywords:
            if fk in line:
                clean = line
                for sep in ['x', 'X', '×', '*', '\t']:
                    if sep in clean:
                        clean = clean.split(sep)[0]
                clean = re.sub(r'[¥￥]\s*[\d.]+', '', clean)
                clean = re.sub(r'[\d.]+\s*(元)?\s*$', '', clean)
                clean = re.sub(r'\s*[xX×\*]\s*\d+\s*$', '', clean)
                clean = clean.strip()
                if clean and clean not in food_items and len(clean) >= 2 and len(clean) <= 20:
                    food_items.append(clean)
                break

    if food_items:
        return '、'.join(food_items[:3])

    for line in lines:
        if any(w in line for w in skip_words):
            continue
        if any(w in line for w in price_keywords):
            continue
        clean = re.sub(r'[¥￥\d. ,:：\s]+', '', line)
        if 2 <= len(clean) <= 20 and re.search(r'[\u4e00-\u9fff]', clean):
            return clean

    return ''


def extract_name_generic(text):
    lines = [l.strip() for l in text.split('\n') if l.strip()]

    name_patterns = [
        r'(?:店名|商户|商家|店铺|名称)\s*[：:]\s*(.+)',
        r'([\u4e00-\u9fff]{2,}(?:超市|便利店|餐厅|饭店|酒店|药房|药店|医院|商场|市场|商店|饼店|面馆|火锅|烧烤|快餐|小吃|奶茶|咖啡|酒吧|KTV|影院|健身房|加油站|停车场|书店))',
    ]
    for pattern in name_patterns:
        match = re.search(pattern, text)
        if match:
            name = match.group(1) if match.lastindex else match.group(0)
            if name and len(name) >= 2:
                return name.strip()[:20]

    for line in lines[:5]:
        if re.search(r'[\u4e00-\u9fff]', line):
            clean = re.sub(r'[¥￥\d.,:：\s年月日]', '', line)
            if 2 <= len(clean) <= 20:
                if any(kw in line for kw in ['店', '馆', '院', '站', '场', '司', '厅']):
                    return clean[:20]

    candidates = []
    for line in lines:
        clean = re.sub(r'[¥￥\d.,:：\s年月日]', '', line)
        if 2 <= len(clean) <= 20 and re.search(r'[\u4e00-\u9fff]', clean):
            skip = ['合计', '总计', '小计', '应付', '实付', '优惠', '支付', '收银',
                    '桌号', '单号', '日期', '时间', '电话', '地址']
            if not any(w in clean for w in skip):
                candidates.append(clean)

    if len(candidates) >= 2:
        name_pairs = [(c, sum(1 for kw in ['超市', '店', '馆', '厅', '院', '站', '场', '司'] if kw in c)) for c in candidates]
        name_pairs.sort(key=lambda x: x[1], reverse=True)
        if name_pairs[0][1] > 0:
            return name_pairs[0][0][:20]
        return candidates[0][:20]
    elif candidates:
        return candidates[0][:20]

    return ''


def extract_name_by_category(text, category):
    if category == '购物':
        return extract_name_for_shopping(text)
    elif category == '餐饮':
        return extract_name_for_food(text)
    else:
        return extract_name_generic(text)


def parse_ocr_text(text):
    amount = 0.0
    date_str = datetime.date.today().strftime('%Y-%m-%d')
    category = '其他'
    trans_type = 'expense'

    prioritized_price_patterns = [
        r'(?:实付|实收|实缴|已付|优惠后|折后|券后|满减后|活动价)\s*[¥￥:\s：]*\s*(\d+\.?\d*)',
        r'(?:支付|付款|应付|实付)\s*[¥￥:\s：]*\s*(\d+\.?\d*)',
        r'(?:在线支付|微信支付|支付宝|银行卡|现金)\s*[¥￥:\s：]*\s*(\d+\.?\d*)',
    ]

    for pattern in prioritized_price_patterns:
        match = re.search(pattern, text)
        if match:
            try:
                val = float(match.group(1))
                if 0.01 < val < 99999:
                    amount = val
                    break
            except ValueError:
                pass

    if amount == 0.0:
        amount_lines = []
        for line in text.split('\n'):
            am = re.findall(r'\d+\.?\d*', line)
            nums = [float(a) for a in am if 0.01 < float(a) < 99999]
            line_has_price = bool(re.search(r'[¥￥元]|金额|合计|总计|价格|单价|小计|应付|实付|付款|支付|消费', line))
            if nums:
                amount_lines.append((line_has_price, max(nums), min(nums)))
        if amount_lines:
            price_lines = [l for l in amount_lines if l[0]]
            if price_lines:
                price_lines.sort(key=lambda x: x[1])
                amount = price_lines[0][1]
            else:
                amount_lines.sort(key=lambda x: x[1])
                amount = amount_lines[0][1]

    amount = round(amount, 2)

    date_patterns = [
        r'(\d{4})[-/年](\d{1,2})[-/月](\d{1,2})[日]?',
        r'(\d{2})[-/.](\d{1,2})[-/.](\d{1,2})',
    ]
    for pattern in date_patterns:
        match = re.search(pattern, text)
        if match:
            groups = match.groups()
            try:
                y, m, d = int(groups[0]), int(groups[1]), int(groups[2])
                if y < 100: y += 2000
                if 2020 <= y <= 2099 and 1 <= m <= 12 and 1 <= d <= 31:
                    date_str = f'{y}-{m:02d}-{d:02d}'
                    break
            except ValueError:
                pass

    if trans_type == 'expense':
        scores = {}
        for cat, keywords in CATEGORY_KEYWORDS.items():
            if cat == '收入':
                continue
            scores[cat] = 0
            for kw, weight in keywords:
                if kw in text:
                    scores[cat] += weight

        if scores:
            best_cat = max(scores, key=scores.get)
            if scores[best_cat] >= 3:
                category = best_cat

    name = extract_name_by_category(text, category)

    return {
        'amount': amount,
        'date': date_str,
        'category': category,
        'name': name,
        'trans_type': trans_type
    }


@app.route('/')
def index():
    return render_template('index.html', page='home')


@app.route('/detail')
def detail_page():
    card = request.args.get('card', 'month')
    return render_template('index.html', page='detail', detail_card=card)


@app.route('/history')
def history_page():
    return render_template('index.html', page='history')


@app.route('/receipts/<path:filename>')
def serve_receipt(filename):
    return send_from_directory(RECEIPTS_DIR, filename)


@app.route('/api/ocr/scan', methods=['POST'])
def ocr_scan():
    if 'image' not in request.files:
        return jsonify({'success': False, 'error': '没有上传图片'}), 400
    file = request.files['image']
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ('.png', '.jpg', '.jpeg', '.bmp', '.tiff', '.webp'):
        return jsonify({'success': False, 'error': '不支持的图片格式'}), 400
    filename = f"{uuid.uuid4().hex}{ext}"
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    file.save(filepath)
    try:
        with open(filepath, 'rb') as f:
            payload = {
                'apikey': OCR_SPACE_API_KEY, 'language': 'chs',
                'OCREngine': '2', 'scale': 'true',
                'detectOrientation': 'true', 'isTable': 'true',
            }
            files_data = {'file': (filename, f, 'application/octet-stream')}
            resp = http_requests.post(OCR_SPACE_API_URL, data=payload, files=files_data, timeout=60)
            result = resp.json()
        if result.get('IsErroredOnProcessing'):
            return jsonify({'success': False, 'error': result.get('ErrorMessage', '识别失败')}), 500
        parsed = result.get('ParsedResults', [])
        if not parsed:
            return jsonify({'success': False, 'error': '无识别结果'}), 500
        raw_text = parsed[0].get('ParsedText', '').strip()
        extracted = parse_ocr_text(raw_text)
        receipt_filename = f"{uuid.uuid4().hex}{ext}"
        shutil.copy(filepath, os.path.join(RECEIPTS_DIR, receipt_filename))
        return jsonify({'success': True, 'raw_text': raw_text, 'extracted': extracted, 'receipt_path': receipt_filename})
    except Exception as e:
        return jsonify({'success': False, 'error': f'识别失败: {str(e)}'}), 500
    finally:
        if os.path.exists(filepath):
            os.remove(filepath)


@app.route('/api/expenses', methods=['GET'])
def get_expenses():
    category = request.args.get('category', '')
    year_month = request.args.get('month', '')
    date_from = request.args.get('from', '')
    date_to = request.args.get('to', '')
    search = request.args.get('search', '')
    trans_type = request.args.get('type', '')
    limit = request.args.get('limit', '')

    query = 'SELECT * FROM expenses WHERE 1=1'
    params = []

    if category:
        query += ' AND category = ?'
        params.append(category)
    if year_month:
        query += " AND date LIKE ?"
        params.append(f'{year_month}%')
    if date_from:
        query += ' AND date >= ?'
        params.append(date_from)
    if date_to:
        query += ' AND date <= ?'
        params.append(date_to + ' 23:59')
    if search:
        query += ' AND (name LIKE ? OR description LIKE ? OR category LIKE ?)'
        params.extend([f'%{search}%', f'%{search}%', f'%{search}%'])
    if trans_type:
        query += ' AND trans_type = ?'
        params.append(trans_type)

    query += ' ORDER BY date DESC, id DESC'

    if limit:
        query += f' LIMIT {int(limit)}'

    with get_db() as conn:
        rows = conn.execute(query, params).fetchall()
        expenses = [dict(r) for r in rows]
    return jsonify({'success': True, 'expenses': expenses})


@app.route('/api/expenses', methods=['POST'])
def add_expense():
    data = request.get_json() or {}
    amount = data.get('amount', 0)
    if not amount or float(amount) <= 0:
        return jsonify({'success': False, 'error': '金额无效'}), 400

    with get_db() as conn:
        cursor = conn.execute(
            'INSERT INTO expenses (amount, category, name, description, date, icon, image_path, trans_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            (float(amount), data.get('category', '其他'), data.get('name', ''),
             data.get('description', ''), data.get('date', datetime.datetime.now().strftime('%Y-%m-%d %H:%M')),
             data.get('icon', ''), data.get('image_path', ''), data.get('trans_type', 'expense'))
        )
        row = conn.execute('SELECT * FROM expenses WHERE id = ?', (cursor.lastrowid,)).fetchone()
    return jsonify({'success': True, 'expense': dict(row)})


@app.route('/api/expenses/<int:expense_id>', methods=['PUT'])
def update_expense(expense_id):
    data = request.get_json() or {}
    with get_db() as conn:
        conn.execute(
            'UPDATE expenses SET amount=?, category=?, name=?, description=?, date=?, icon=?, trans_type=? WHERE id=?',
            (data.get('amount'), data.get('category'), data.get('name', ''),
             data.get('description', ''), data.get('date'),
             data.get('icon', ''), data.get('trans_type', 'expense'), expense_id)
        )
        row = conn.execute('SELECT * FROM expenses WHERE id = ?', (expense_id,)).fetchone()
    if row:
        return jsonify({'success': True, 'expense': dict(row)})
    return jsonify({'success': False, 'error': '记录不存在'}), 404


@app.route('/api/expenses/<int:expense_id>', methods=['DELETE'])
def delete_expense(expense_id):
    with get_db() as conn:
        row = conn.execute('SELECT image_path FROM expenses WHERE id = ?', (expense_id,)).fetchone()
        if row and row['image_path']:
            img_path = os.path.join(RECEIPTS_DIR, row['image_path'])
            if os.path.exists(img_path):
                os.remove(img_path)
        conn.execute('DELETE FROM expenses WHERE id = ?', (expense_id,))
    return jsonify({'success': True})


@app.route('/api/summary', methods=['GET'])
def summary():
    today = datetime.date.today()
    today_str = today.strftime('%Y-%m-%d')
    this_month = today.replace(day=1).strftime('%Y-%m')

    with get_db() as conn:
        total_expense = conn.execute("SELECT COALESCE(SUM(amount),0) as t FROM expenses WHERE trans_type='expense'").fetchone()['t']
        total_income = conn.execute("SELECT COALESCE(SUM(amount),0) as t FROM expenses WHERE trans_type='income'").fetchone()['t']

        day_expense = conn.execute("SELECT COALESCE(SUM(amount),0) as t FROM expenses WHERE trans_type='expense' AND date LIKE ?", (f'{today_str}%',)).fetchone()['t']
        month_expense = conn.execute("SELECT COALESCE(SUM(amount),0) as t FROM expenses WHERE trans_type='expense' AND date LIKE ?", (f'{this_month}%',)).fetchone()['t']

        day_income = conn.execute("SELECT COALESCE(SUM(amount),0) as t FROM expenses WHERE trans_type='income' AND date LIKE ?", (f'{today_str}%',)).fetchone()['t']
        month_income = conn.execute("SELECT COALESCE(SUM(amount),0) as t FROM expenses WHERE trans_type='income' AND date LIKE ?", (f'{this_month}%',)).fetchone()['t']

        count = conn.execute('SELECT COUNT(*) as c FROM expenses').fetchone()['c']
        income_count = conn.execute("SELECT COUNT(*) as c FROM expenses WHERE trans_type='income'").fetchone()['c']

    return jsonify({'success': True,
        'total': round(total_expense, 2), 'total_income': round(total_income, 2),
        'day_total': round(day_expense, 2), 'month_total': round(month_expense, 2),
        'day_income': round(day_income, 2), 'month_income': round(month_income, 2),
        'count': count, 'income_count': income_count,
        'balance': round(total_income - total_expense, 2)})


@app.route('/api/chart', methods=['GET'])
def chart_data():
    scope = request.args.get('scope', 'month')
    chart_type = request.args.get('type', 'expense')
    today = datetime.date.today()
    this_month = today.replace(day=1).strftime('%Y-%m')

    with get_db() as conn:
        if scope == 'day':
            rows = conn.execute(
                "SELECT category, SUM(amount) as total FROM expenses WHERE trans_type=? AND date LIKE ? GROUP BY category",
                (chart_type, f'{today.strftime("%Y-%m-%d")}%')
            ).fetchall()
            cat_pie = [dict(r) for r in rows]
            total = conn.execute("SELECT COALESCE(SUM(amount),0) as t FROM expenses WHERE trans_type=? AND date LIKE ?",
                                 (chart_type, f'{today.strftime("%Y-%m-%d")}%')).fetchone()['t']
            return jsonify({'success': True, 'scope': 'day', 'total': round(total, 2), 'chart_type': chart_type,
                            'title': f'今天 ({today.strftime("%m月%d日")})', 'cat_pie': cat_pie, 'daily': []})

        elif scope == 'month':
            rows = conn.execute(
                "SELECT category, SUM(amount) as total FROM expenses WHERE trans_type=? AND date LIKE ? GROUP BY category",
                (chart_type, f'{this_month}%')
            ).fetchall()
            cat_pie = [dict(r) for r in rows]
            daily_rows = conn.execute(
                "SELECT substr(date,1,10) as d, SUM(amount) as total FROM expenses WHERE trans_type=? AND date LIKE ? GROUP BY d ORDER BY d",
                (chart_type, f'{this_month}%')
            ).fetchall()
            daily = [{'date': r['d'][-5:] if len(r['d']) >= 10 else r['d'], 'amount': round(r['total'], 2)} for r in daily_rows]
            total = conn.execute("SELECT COALESCE(SUM(amount),0) as t FROM expenses WHERE trans_type=? AND date LIKE ?",
                                 (chart_type, f'{this_month}%')).fetchone()['t']
            return jsonify({'success': True, 'scope': 'month', 'total': round(total, 2), 'chart_type': chart_type,
                            'title': f'本月 ({this_month})', 'cat_pie': cat_pie, 'daily': daily})

        else:
            rows = conn.execute(
                "SELECT category, SUM(amount) as total FROM expenses WHERE trans_type=? GROUP BY category", (chart_type,)
            ).fetchall()
            cat_pie = [dict(r) for r in rows]
            monthly_rows = conn.execute(
                "SELECT substr(date,1,7) as m, SUM(amount) as total FROM expenses WHERE trans_type=? GROUP BY m ORDER BY m", (chart_type,)
            ).fetchall()
            monthly = [{'date': r['m'], 'amount': round(r['total'], 2)} for r in monthly_rows]
            total = conn.execute("SELECT COALESCE(SUM(amount),0) as t FROM expenses WHERE trans_type=?", (chart_type,)).fetchone()['t']
            return jsonify({'success': True, 'scope': 'all', 'total': round(total, 2), 'chart_type': chart_type,
                            'title': '全部历史', 'cat_pie': cat_pie, 'monthly': monthly})


@app.route('/api/months', methods=['GET'])
def available_months():
    with get_db() as conn:
        rows = conn.execute("SELECT DISTINCT substr(date,1,7) as m FROM expenses ORDER BY m DESC").fetchall()
    return jsonify({'success': True, 'months': [r['m'] for r in rows]})


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(debug=False, host='0.0.0.0', port=port)
