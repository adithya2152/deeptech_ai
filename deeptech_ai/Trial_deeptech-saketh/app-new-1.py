import streamlit as st
import os
import json
import sqlite3
import pandas as pd
from datetime import datetime
import plotly.graph_objects as go
import numpy as np

# --- IMPORT MODULES ---
from scoring_engine import DeepTechScorer
from ai_scorer_new import AIScorer
from parsers import ResumeParser, WebResumeParser, ResearchParser, GitHubParser, EngagementCrawler
from matchern import SemanticMatcher
from aggregator import DocumentAggregator

# --- SETUP ---
OUTPUT_DIR = "output"
os.makedirs(OUTPUT_DIR, exist_ok=True)
DB_FILE = "deeptech_profiles.db"

# --- DATABASE FUNCTIONS ---
def init_db():
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute('''
        CREATE TABLE IF NOT EXISTS profiles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            email TEXT,
            overall_score REAL,
            tier TEXT,
            timestamp DATETIME,
            full_report_json TEXT
        )
    ''')
    conn.commit()
    conn.close()

def save_to_db(report_data):
    try:
        conn = sqlite3.connect(DB_FILE)
        c = conn.cursor()
        
        # Safely extract fields
        if 'parsed_data' in report_data:
            name = report_data['parsed_data'].get('name', 'Anonymous')
            email = report_data['parsed_data'].get('email', 'N/A')
            score = report_data.get('scores', {}).get('overall_score', 0)
            tier = report_data.get('tier_prediction', 'N/A')
        else:
            name = report_data.get('profile', {}).get('name', 'Anonymous')
            email = report_data.get('profile', {}).get('email', 'N/A')
            score = report_data.get('scores', {}).get('overall', 0)
            tier = report_data.get('rank', 'N/A')

        ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
        c.execute('''
            INSERT INTO profiles (name, email, overall_score, tier, timestamp, full_report_json)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (name, email, score, tier, ts, json.dumps(report_data)))
        
        conn.commit()
        conn.close()
        return True
    except Exception as e:
        st.error(f"Database Error: {e}")
        return False

def fetch_last_profile():
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute("SELECT full_report_json FROM profiles ORDER BY id DESC LIMIT 1")
    row = c.fetchone()
    conn.close()
    if row:
        return json.loads(row[0])
    return None

init_db()

@st.cache_resource
def load_matcher():
    return SemanticMatcher()

@st.cache_resource
def load_aggregator():
    return DocumentAggregator()

st.set_page_config(page_title="DeepTech Content View", layout="wide")

# --- CUSTOM CSS ---
st.markdown("""
<style>
    .profile-card { background-color: #0e1117; border: 1px solid #30333F; border-radius: 10px; padding: 20px; }
    .skill-tag { background-color: #262730; border: 1px solid #4a4a4a; border-radius: 15px; padding: 5px 10px; margin: 2px; display: inline-block; font-size: 0.85em; color: #00CC96; }
</style>
""", unsafe_allow_html=True)

st.title("🚀 DeepTech Scorer: Content Intelligence")

# --- SIDEBAR ---
with st.sidebar:
    st.header("⚙️ Configuration")
    # Updated label to remind user about OpenRouter Key
    api_key = st.text_input("OpenRouter API Key (sk-or...)", type="password")
    github_token = st.text_input("GitHub Token (Optional)", type="password")
    
    st.markdown("---")
    scoring_method = st.radio("Choose Scoring Engine:", ["🧠 AI-Based (LLM)", "📊 Rule-Based"])
    use_ai_scoring = scoring_method.startswith("🧠")
    
    st.markdown("---")
    job_desc = st.text_area("Job Description (JD)", height=150)
    
    st.markdown("---")
    if st.button("📂 View Database Records"):
        conn = sqlite3.connect(DB_FILE)
        try:
            df = pd.read_sql_query("SELECT id, name, email, overall_score, tier, timestamp FROM profiles ORDER BY id DESC", conn)
            st.dataframe(df)
        except: st.error("Database empty.")
        conn.close()

scorer = DeepTechScorer()
matcher = load_matcher()
aggregator = load_aggregator()

if 'documents' not in st.session_state: st.session_state.documents = []
if 'document_embeddings' not in st.session_state: st.session_state.document_embeddings = []
if 'aggregated_profile' not in st.session_state: st.session_state.aggregated_profile = aggregator._empty_profile()
if 'current_profile_data' not in st.session_state: st.session_state.current_profile_data = None

# --- TABS ---
tab_input, tab_analysis, tab_profile = st.tabs(["1. Data Input", "2. Analysis Engine", "3. User Profile View"])

# --- TAB 1: INPUT ---
with tab_input:
    st.caption(f"📦 {len(st.session_state.documents)} document(s) processed")
    
    col1, col2 = st.columns(2)
    with col1:
        uploaded_files = st.file_uploader("Upload PDF Resume(s)", type=["pdf","txt","docx"], accept_multiple_files=True)
        portfolio_url = st.text_input("Portfolio URL")

    with col2:
        research_files = st.file_uploader("Upload Research Paper(s)", type=["pdf", "txt", "docx"], accept_multiple_files=True)
        github_input = st.text_input("GitHub Username")

    st.divider()
    
    if st.button("🚀 ANALYZE ALL DATA", type="primary"):
        st.session_state.documents = []
        st.session_state.document_embeddings = []
        
        print("\n" + "="*50)
        print("🚀 STARTING DATA EXTRACTION")
        print("="*50)

        # 1. Process PDF Resume
        if uploaded_files:
            p_resume = ResumeParser()
            for f in uploaded_files:
                txt = p_resume.extract_text(f.read())
                print(f"\n[DEBUG] Resume Extracted ({f.name}):\n{txt[:200]}...\n(Total chars: {len(txt)})")
                st.session_state.documents.append({"source_type": "resume", "raw_text": txt})
                st.session_state.document_embeddings.append(matcher.encode_document(txt))

        # 2. Process Portfolio URL
        if portfolio_url:
            p_web = WebResumeParser()
            web_data = p_web.parse(portfolio_url)
            txt = web_data.get('raw_text', '')
            print(f"\n[DEBUG] Portfolio Extracted ({portfolio_url}):\n{txt[:200]}...\n(Total chars: {len(txt)})")
            st.session_state.documents.append({"source_type": "portfolio", "raw_text": txt})
            st.session_state.document_embeddings.append(matcher.encode_document(txt))

        # 3. Process Research
        if research_files:
            p_research = ResearchParser()
            for f in research_files:
                # Pass file bytes to parser
                file_bytes = f.read()
                data = p_research.parse(file_bytes)
                txt = data.get('raw_text', '')
                print(f"\n[DEBUG] Research Paper Extracted:\n{txt[:200]}...\n(Title: {data.get('title')})")
                st.session_state.documents.append({"source_type": "research", "raw_text": txt})
                st.session_state.document_embeddings.append(matcher.encode_document(txt))
        
        # 4. Process GitHub
        if github_input:
            p_github = GitHubParser(github_token if github_token else None)
            gh_data = p_github.parse(github_input)
            gh_text = str(gh_data)
            print(f"\n[DEBUG] GitHub Data Extracted ({github_input}):\nRepos: {gh_data.get('repos_count')}, Stars: {gh_data.get('total_stars')}")
            st.session_state.documents.append({"source_type": "github", "raw_text": gh_text})
            st.session_state.document_embeddings.append(matcher.encode_document(gh_text))

        # 5. Aggregate
        st.session_state.aggregated_profile = aggregator.aggregate_profile(st.session_state.documents)
        print("\n" + "="*50)
        print("✅ EXTRACTION COMPLETE. READY FOR AI.")
        print("="*50 + "\n")
        
        st.success(f"Data Processed! {len(st.session_state.documents)} sources ready. Check Terminal for details. Move to Analysis Tab.")

# --- TAB 2: ANALYSIS ---
with tab_analysis:
    if not st.session_state.documents:
        st.warning("Please input data in Tab 1 first.")
    elif use_ai_scoring and api_key:
        if 'ai_analysis_result' not in st.session_state:
            with st.spinner("🤖 AI analyzing..."):
                ai_scorer = AIScorer(api_key)
                res = ai_scorer.analyze_candidate(
                    {"documents": st.session_state.documents},
                    job_desc
                )
                st.session_state.ai_analysis_result = res
        
        res = st.session_state.ai_analysis_result
        scores = res.get('scores', {})
        
        col_res1, col_res2 = st.columns([3, 1])
        with col_res1:
            st.subheader("Analysis Complete")
            st.write(f"**Recommendation:** {res.get('admin_recommendation', {}).get('decision')}")
        with col_res2:
            st.metric("AI Score", f"{scores.get('overall_score', 0):.1f}/100")
        
        st.divider()
        
        if st.button("💾 SAVE & GENERATE PROFILE", type="primary", use_container_width=True):
            final_report = {
                "parsed_data": res.get('parsed_data'),
                "scores": res.get('scores'),
                "admin_recommendation": res.get('admin_recommendation'),
                "tier_prediction": res.get('tier_prediction'),
                "documents_analyzed": len(st.session_state.documents),
                "timestamp": str(datetime.now())
            }
            if save_to_db(final_report):
                st.session_state.current_profile_data = final_report
                st.success("✅ Saved to Database! Go to 'User Profile View' tab.")
            else:
                st.error("Failed to save to database.")

# --- TAB 3: PROFILE VIEW ---
with tab_profile:
    profile_data = st.session_state.get('current_profile_data')
    
    if not profile_data:
        if st.button("🔄 Load Last Saved Profile"):
            profile_data = fetch_last_profile()
            st.session_state.current_profile_data = profile_data
            st.rerun()
    
    if profile_data:
        p_data = profile_data.get('parsed_data', {})
        rec = profile_data.get('admin_recommendation', {})
        scores = profile_data.get('scores', {})
        
        # 1. Header
        with st.container(border=True):
            col_head1, col_head2 = st.columns([3, 1])
            with col_head1:
                st.title(p_data.get('name', 'Candidate Profile'))
                st.caption(f"Generated: {profile_data.get('timestamp')}")
                st.markdown(f"**Email:** {p_data.get('email', 'N/A')} | **Exp:** {p_data.get('years_experience', 0)} Years")
            with col_head2:
                st.metric("Overall Score", f"{scores.get('overall_score', 0)}", delta=profile_data.get('tier_prediction'))
        
        col_main1, col_main2 = st.columns([2, 1])
        
        with col_main1:
            st.markdown("### 🛠️ Technical Skills")
            skills = p_data.get('all_skills', [])
            if skills:
                html_tags = "".join([f"<span class='skill-tag'>{s}</span>" for s in skills[:15]])
                st.markdown(html_tags, unsafe_allow_html=True)
            
            st.divider()
            
            st.markdown("### 📋 Admin Recommendation")
            st.info(f"**Decision:** {rec.get('decision', 'N/A')} | **Priority:** {rec.get('hiring_priority', 'N/A')}")
            st.write(rec.get('justification', 'No justification provided.'))
            
            st.markdown("**Recommended Roles:**")
            for role in rec.get('recommended_roles', []):
                st.markdown(f"- {role}")
            
            # Show projects if available (from detailed prompt)
            if rec.get('best_fit_projects'):
                 st.markdown("**Best Fit Projects:**")
                 for proj in rec.get('best_fit_projects', []):
                    st.markdown(f"- {proj}")

        with col_main2:
            st.markdown("### 📊 Performance Map")
            categories = ['Expertise', 'Performance', 'Reliability', 'Quality', 'Engagement']
            values = [
                scores.get('expertise_score', 0),
                scores.get('performance_score', 0),
                scores.get('reliability_score', 0),
                scores.get('quality_score', 0),
                scores.get('engagement_score', 0)
            ]
            fig = go.Figure(data=go.Scatterpolar(r=values, theta=categories, fill='toself', line_color='#00CC96'))
            fig.update_layout(polar=dict(radialaxis=dict(visible=True, range=[0, 100])), showlegend=False, height=300, margin=dict(l=20, r=20, t=20, b=20))
            st.plotly_chart(fig, use_container_width=True)
            
            with st.expander("📈 Areas for Growth", expanded=True):
                for area in rec.get('areas_for_growth', []):
                    st.markdown(f"• {area}")
    else:
        st.info("No profile loaded. Analyze data in Tab 2 and click 'Save', or click 'Load Last Saved Profile'.")