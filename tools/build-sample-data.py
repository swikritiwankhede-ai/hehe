"""Builds the Report Studio data workbook (one tab per data type) plus a CSV per tab.

Outputs
  data/report-studio-data-template.xlsx  empty tabs with headers: import into Google Sheets
  data/report-studio-data-sample.xlsx    the same, filled with two sample events
  data/sample/<tab>.csv                  the sample data, for the local run (tools/run-pipeline.mjs)

Sample events
  etbe-bws-2025      IP. Real: event details, 26 sponsors, 35 speakers (BWS 2025 website), 5 market stats (BWS sales deck).
                     Sample: sessions, attendees, companies, social posts, leader quotes.
  etbe-northwind-25  Custom. Entirely fictional ("Northwind Cloud" is a made-up sponsor) to show the Custom deck.
"""
import csv, json, os, random, re
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENGINE = os.path.join(ROOT, 'engine', 'report-engine.js')
random.seed(20250704)

# Tab layout is read from the engine so the sheet and the code never drift apart.
src = open(ENGINE, encoding='utf-8').read()
TABS = {}
for m in re.finditer(r"^\s{4}(\w+): \{ cols: \[([^\]]*)\]", src, re.M):
    TABS[m.group(1)] = ['row_key'] + re.findall(r"'([^']+)'", m.group(2)) if m.group(1) != 'runs' else re.findall(r"'([^']+)'", m.group(2))
ORDER = ['events', 'sponsors', 'speakers', 'sessions', 'attendees', 'companies', 'wishlist', 'deliverables', 'followups', 'feedback', 'video_plan', 'insights', 'photos', 'social', 'market', 'custom', 'runs']
assert set(ORDER) == set(TABS), set(TABS) ^ set(ORDER)

def fnv(s):
    h = 0x811c9dc5
    for ch in s:
        h ^= ord(ch); h = (h * 0x01000193) & 0xffffffff
    return format(h, '08x')
KEYS = {}
for m in re.finditer(r"^\s{4}(\w+): \{ cols: \[[^\]]*\], key: \[([^\]]*)\]", src, re.M):
    KEYS[m.group(1)] = re.findall(r"'([^']+)'", m.group(2))
squash = lambda s: re.sub(r'[^a-z0-9]+', '', str(s or '').lower())

data = {t: [] for t in ORDER}
def add(tab, **row):
    r = {c: '' for c in TABS[tab]}
    r.update({k: ('' if v is None else v) for k, v in row.items()})
    if 'row_key' in r and KEYS.get(tab):
        r['row_key'] = fnv(tab + '|' + '|'.join(squash(r[c]) for c in KEYS[tab]))
    data[tab].append(r)

# ---------------- IP: Brand World Summit 2025 ----------------
EK = 'etbe-bws-2025'
add('events', event_key=EK, model='IP', name='Brand World Summit 2025', edition='7th Edition',
    theme_line='Reimagining Marketing In The Age of AI', date_start='2025-07-04', date_end='2025-07-04',
    venue='Grand Hyatt, BKC, Mumbai', city='Mumbai', vertical='BrandEquity', hashtag='#ETBWS2025', short_name='BWS 2025',
    target_attendees=1000, target_speakers=100, theme_id='thm_etbe-bws_2025_v1', accent_hex='#E7425F',
    next_edition='See you at the 8th edition', status='active', lead_email='')
TIER = {"Presenting Partner": "Presenting", "Powered By": "Powered by", "Co-Powered by": "Co-powered", "In Association With": "In association",
        "Gold Partners": "Gold", "Silver Partner": "Silver", "Associate Partners": "Associate", "Exhibitors": "Exhibitor", "Startup Arena Showcase": "Start-up"}
for r in csv.DictReader(open(os.path.join(ROOT, 'samples', 'bws2025_sponsors.csv'), encoding='utf-8')):
    add('sponsors', event_key=EK, name=r['Sponsor Name'], group=r['Group'], tier=TIER.get(r['Group'], 'Category partner'), logo_url=r['Logo URL'])
cxo = re.compile(r'\b(chief|ceo|cmo|founder|co-founder|managing director|md|chairman|president)\b', re.I)
speakers = list(csv.DictReader(open(os.path.join(ROOT, 'samples', 'bws2025_speakers.csv'), encoding='utf-8')))
for r in speakers:
    add('speakers', event_key=EK, name=r['Name'], designation=r['Designation'], company=r['Company'],
        is_key='Yes' if cxo.search(r['Designation']) and not re.search(r'vice president', r['Designation'], re.I) else '')
# Sessions are SAMPLE (the real agenda is not in this repo): formats and times only, speakers from the real list.
fmt = ['Keynote', 'Keynote', 'Panel', 'Fireside', 'Panel', 'Case study', 'Panel', 'Keynote', 'Panel', 'Fireside', 'Panel', 'Case study', 'Panel']
t = 10 * 60
names = [s['Name'] for s in speakers]
for i, f in enumerate(fmt):
    dur = 20 if f in ('Keynote', 'Case study') else 30 if f == 'Fireside' else 40
    hall = 'Audi1' if i % 3 else 'Audi2'
    sp = '; '.join(names[(i * 3) % len(names):(i * 3) % len(names) + (3 if f == 'Panel' else 1)])
    add('sessions', event_key=EK, day='Day 1', start=f'{t//60:02d}:{t%60:02d}', end=f'{(t+dur)//60:02d}:{(t+dur)%60:02d}', hall=hall,
        title=f'{f} {i+1} (sample title)', format=f, owner='ET', speakers=sp)
    t += dur + (60 if i == 5 else 5)
add('sessions', event_key=EK, day='Day 1', start='13:30', end='14:30', hall='Foyer', title='Networking lunch', format='Informal', owner='ET')
# Attendees: the fictional OneWorld export sample (mobile column is dropped by the engine)
COS = {}
for r in csv.DictReader(open(os.path.join(ROOT, 'samples', 'oneworld_registrations_sample.csv'), encoding='utf-8')):
    if not r['Official Email']:
        continue
    add('attendees', event_key=EK, first_name=r['First Name'], last_name=r['Last Name'], email=r['Official Email'].lower(), company=r['Company'],
        designation=r['Designation'], city=r['City'], status=r['Status'], lead_source=r['Lead Source'], conversion_source=r['Conversion Source'],
        registered_at=r['Registration Date'], checked_in_at='2025-07-04 09:%02d' % random.randint(0, 59) if r['Status'] == 'Attended' else '')
    COS[r['Company']] = 1
ORGTYPE = {'Monsoon Media': ('Agency', 'Media & advertising'), 'Indigo Retail': ('Brand', 'Retail & e-commerce')}
IND = ['FMCG', 'BFSI', 'Retail & e-commerce', 'Automotive', 'Telecom', 'Healthcare & pharma', 'Apparel & lifestyle', 'Consumer durables']
for i, c in enumerate(sorted(COS)):
    ot, ind = ORGTYPE.get(c, ('Brand' if i % 5 else 'Agency', IND[i % len(IND)]))
    add('companies', company=c, org_type=ot, industry=ind, hq_region=['West', 'North', 'South', 'East'][i % 4])
# Social: LinkedIn sample export + sample Instagram and YouTube rows
for r in csv.DictReader(open(os.path.join(ROOT, 'samples', 'linkedin_page_export_sample.csv'), encoding='utf-8')):
    add('social', event_key=EK, platform='LinkedIn', post_url=r['Post link'], posted_at=r['Created date'], text='#ETBWS2025 Brand World Summit 2025 (sample post)',
        impressions=r['Impressions'], reactions=r['Reactions'], comments=r['Comments'], shares=r['Reposts'], clicks=r['Clicks'], as_of='2025-07-05')
for i in range(10):
    d = '2025-06-%02d' % (3 + i * 3) if i < 7 else '2025-07-04'
    add('social', event_key=EK, platform='Instagram', post_url=f'https://www.instagram.com/p/sample{i}/', posted_at=d,
        text='Countdown to #ETBWS2025 (sample)' if i < 7 else 'Live from #ETBWS2025 (sample)', views=random.randint(9000, 30000), reach=random.randint(6000, 20000),
        reactions=random.randint(200, 900), comments=random.randint(5, 60), shares=random.randint(10, 120), as_of='2025-07-05')
for i in range(6):
    d = '2025-06-%02d' % (10 + i * 4) if i < 3 else '2025-07-04'
    add('social', event_key=EK, platform='YouTube', post_url=f'https://www.youtube.com/watch?v=sample{i}', posted_at=d,
        text=f'Brand World Summit 2025 session {i+1} (sample)', views=random.randint(4000, 40000), reactions=random.randint(50, 600), comments=random.randint(0, 40), as_of='2025-07-05')
# Leader insights: SAMPLE placeholders against real speakers (no words are attributed to them)
for nm in ['Sanjiv Mehta', 'Prabha Narasimhan', 'Rohit Bhasin', 'Kapil Grover']:
    s = next(x for x in speakers if x['Name'] == nm)
    add('insights', event_key=EK, leader=nm, designation=s['Designation'], company=s['Company'], headline='Sample headline: replaced by the approved insight',
        quote='Sample quote. The approved, word-for-word excerpt from this leader\'s session appears here.', theme='AI in marketing', status='approved')
add('insights', event_key=EK, leader='Ashwin Moorthy', designation='CMO', company='Godrej Consumer Products', headline='', quote='Pending sample quote.', status='pending')
# Market stats: real figures from the BWS 2025 sales deck (add source URLs when reviewing)
for stat, val, s, y in [('Indian advertising market', '₹1,64,137 crore; +7% YoY, digital 60%', 'GroupM TYNY', 2025), ('Internet users', '971.5 million', 'TRAI', 2025),
                        ('High-net-worth individuals', '85,698; +6% a year', 'Knight Frank', 2025), ('E-commerce market by 2030', '$350 billion', 'Redseer', 2024),
                        ('Middle class share by 2047', '61% of population', 'PwC', 2024)]:
    add('market', vertical='BrandEquity', statistic=stat, value=val, source=s, source_url='', year=y, theme_tags='Bharat consumers; growth', status='approved')
add('custom', event_key=EK, key='award_line', value='Shark Awards (sample custom field)', source='events team')
add('video_plan', event_key=EK, planned_filename='1140_Audi1_Panel_Rohit-Bhasin_Ashwin-Moorthy', video_type='Panel', leaders='Rohit Bhasin; Ashwin Moorthy', session_time='11:40', hall='Audi1', status='expected')
add('video_plan', event_key=EK, planned_filename='BYTE_NA_SocialbyteTicTac_Kapil-Grover', video_type='Social byte (TicTac)', leaders='Kapil Grover', status='expected')

# ---------------- Custom: fictional Northwind Cloud leaders' retreat ----------------
CK = 'etbe-northwind-25'
SP = 'Northwind Cloud'
add('events', event_key=CK, model='Custom', name='Northwind Leaders Circle 2025 (sample)', edition='', theme_line='From Pilot to Scale: AI in the Enterprise',
    date_start='2025-09-12', date_end='2025-09-14', venue='Sample resort, Goa', city='Goa', vertical='BrandEquity', hashtag='', sponsor_name=SP,
    leaders_committed=30, objectives='Convene 30 CXOs from target accounts | Land the "pilot to scale" narrative | Build relationships beyond the sales cycle | Turn conversations into follow-ups',
    theme_id='', accent_hex='#2B6CB0', next_edition='Thank you from ETBrandEquity Custom Solutions', status='active')
FN = 'Aditi Arjun Bhavna Chirag Deepa Farhan Gauri Harsh Isha Jatin Kavya Lakshay Mira Nakul Ojas Pallavi Raghav Sana Tara Uday Vani Yash Zoya Neil Ritu Kunal Sneha Varun Ira Dev Anika Kabir Leela Omkar Pooja Rhea'.split()
LN = 'Rao Menon Iyer Shah Kapoor Nair Gupta Sethi Joshi Bose Pillai Desai Reddy Malhotra Verma Kulkarni'.split()
TITLES = ['Chief Information Officer', 'Chief Technology Officer', 'CEO', 'Chief Digital Officer', 'VP Engineering', 'Vice President - IT', 'Director - Infrastructure',
          'Head of Data', 'CIO', 'Director Technology', 'Senior Manager - IT', 'Chief Data Officer']
CCOS = [('Aurora Steel', 'Manufacturing', 'East'), ('Bluepeak Pharma', 'Healthcare', 'South'), ('Cedarline Motors', 'Manufacturing', 'West'), ('Delta Grid Power', 'Infrastructure', 'North'),
        ('Everest Finserv', 'BFSI', 'West'), ('Falcon Logistics', 'Infrastructure', 'South'), ('Granite Cement', 'Manufacturing', 'Central'), ('Horizon Hospitals', 'Healthcare', 'South'),
        ('Indus Textiles', 'Manufacturing', 'West'), ('Jade Software', 'Technology', 'South'), ('Kestrel Airways', 'Infrastructure', 'North'), ('Lumen Telecom', 'Technology', 'North'),
        ('Monarch Bank', 'BFSI', 'West'), ('Nimbus Retail', 'Retail', 'South'), ('Orion Chemicals', 'Manufacturing', 'West'), ('Pinnacle Insurance', 'BFSI', 'North'),
        ('Quartz Semiconductors', 'Technology', 'South'), ('Radiant Foods', 'FMCG', 'East'), ('Sapphire Realty', 'Real estate', 'West'), ('Titan Ports', 'Infrastructure', 'West'),
        ('Unity Health', 'Healthcare', 'North'), ('Vertex Analytics', 'Technology', 'South'), ('Willow Agro', 'FMCG', 'Central'), ('Xenon Energy', 'Infrastructure', 'East'),
        ('Yarrow Mobility', 'Manufacturing', 'South'), ('Zenith Media', 'Media', 'West'), ('Apex Tyres', 'Manufacturing', 'South'), ('Beacon Labs', 'Healthcare', 'West')]
for c, ind, reg in CCOS:
    add('companies', company=c, org_type='Brand', industry=ind, hq_region=reg)
people = []
for i in range(38):
    c = CCOS[i % len(CCOS)][0]
    fn, ln = FN[i % len(FN)], LN[(i * 7) % len(LN)]
    email = f'{fn}.{ln}@{squash(c)}.example.com'.lower()
    attended = i < 34
    people.append((fn, ln, email, c))
    add('attendees', event_key=CK, first_name=fn, last_name=ln, email=email, company=c, designation=TITLES[(i * 5) % len(TITLES)], city='',
        status='Attended' if attended else 'No-show', checked_in_at='2025-09-12 17:%02d' % random.randint(0, 59) if attended else '')
ros = [('Day 1', '16:00', '19:30', 'Arrival and welcome (informal)', 'Informal', 'ET'),
       ('Day 2', '09:30', '09:45', 'Welcome note', 'Keynote', 'ET'),
       ('Day 2', '09:45', '10:00', f'{SP} keynote: pilot to scale', 'Keynote', SP),
       ('Day 2', '10:00', '10:45', 'Modernising core infrastructure', 'Session', SP),
       ('Day 2', '10:45', '11:15', 'Tea break', 'Informal', 'ET'),
       ('Day 2', '11:15', '11:45', 'Devices for the hybrid workforce', 'Session', SP),
       ('Day 2', '11:45', '12:05', 'Consumption pricing for AI workloads', 'Session', SP),
       ('Day 2', '12:05', '12:25', 'The real cost of AI at scale', 'Session', SP),
       ('Day 2', '12:25', '12:40', 'Fast-track deployment programme', 'Session', SP),
       ('Day 2', '12:40', '13:20', 'CXO panel: what scaled and what stalled', 'Panel', 'ET'),
       ('Day 2', '13:20', '14:30', 'Lunch', 'Informal', 'ET'),
       ('Day 2', '15:00', '18:00', 'Cricket and music by the beach', 'Informal', 'ET'),
       ('Day 3', '09:00', '12:00', 'Trails and farewell', 'Informal', 'ET')]
for d, a, b, title, f, o in ros:
    add('sessions', event_key=CK, day=d, start=a, end=b, hall='Main', title=title, format=f, owner=o)
for i in range(25):
    if i < 19:
        fn, ln, email, c = people[i]
        outcome = 'Met' if i < 15 else 'Attended, not met'
    else:
        c = ['Omega Shipping', 'Prism Paints', 'Regal Hotels', 'Summit Cables', 'Trident Glass', 'Ultra Polymers'][i - 19]
        fn, ln, email, outcome = 'Target', 'contact', '', 'Did not attend'
    add('wishlist', event_key=CK, sponsor=SP, person_name=f'{fn} {ln}', email=email, company=c, outcome=outcome)
for item, com, dl, st, day in [('Event identity and co-branding', 'Yes', 'Yes', 'Delivered', 'All days'), ('Sponsor keynote', '1', '1', 'Delivered', 'Day 2'),
                               ('Solution sessions', '5', '5', 'Delivered', 'Day 2'), ('Emcee mentions', '6', '6', 'Delivered', 'Day 2'),
                               ('Experiential zone', '1', '1', 'Delivered', 'Day 1–3'), ('On-ground branding', '12 assets', '12 assets', 'Delivered', 'All days'),
                               ('Curated gifting', '30', '34', 'Delivered', 'Day 3')]:
    add('deliverables', event_key=CK, sponsor=SP, item=item, committed=com, delivered=dl, status=st, day=day, evidence='Ops checklist (sample)')
for i, req in enumerate(['Infrastructure assessment', 'Pricing workshop', 'Device pilot for 200 users', 'AI cost review', 'Executive briefing', 'Site visit']):
    fn, ln, email, c = people[i * 2]
    add('followups', event_key=CK, sponsor=SP, person_name=f'{fn} {ln}', company=c, request=req)
for i in range(20):
    fn, ln, email, c = people[i]
    add('feedback', event_key=CK, email=email, rating=5 if i % 3 else 4, would_return='Yes' if i % 7 else 'No',
        comment='The smallest room I have been in with peers who are actually scaling AI.' if i == 2 else '')
add('insights', event_key=CK, leader='Deepa Nair', designation='Chief Information Officer', company='Delta Grid Power', headline='Sample headline',
    quote='Sample quote from a fictional attendee, used to show the layout.', status='approved')
add('insights', event_key=CK, leader='Aditi Rao', designation='Chief Technology Officer', company='Aurora Steel', headline='Sample headline',
    quote='Another sample quote, for layout only.', status='approved')

# ---------------- write ----------------
os.makedirs(os.path.join(ROOT, 'data', 'sample'), exist_ok=True)
def write_book(path, filled):
    wb = Workbook(); wb.remove(wb.active)
    for tab in ORDER:
        ws = wb.create_sheet(tab)
        ws.append(TABS[tab])
        for c in ws[1]:
            c.font = Font(bold=True, color='FFFFFF'); c.fill = PatternFill('solid', fgColor='1C1B1E')
        ws.freeze_panes = 'A2'
        if filled:
            for r in data[tab]:
                ws.append([r.get(c, '') for c in TABS[tab]])
        for col in ws.columns:
            ws.column_dimensions[col[0].column_letter].width = min(40, max(10, max(len(str(c.value or '')) for c in col[:50]) + 2))
    wb.save(path)
write_book(os.path.join(ROOT, 'data', 'report-studio-data-template.xlsx'), False)
write_book(os.path.join(ROOT, 'data', 'report-studio-data-sample.xlsx'), True)
for tab in ORDER:
    with open(os.path.join(ROOT, 'data', 'sample', tab + '.csv'), 'w', newline='', encoding='utf-8') as f:
        w = csv.DictWriter(f, fieldnames=TABS[tab]); w.writeheader(); w.writerows(data[tab])
print({t: len(data[t]) for t in ORDER})
