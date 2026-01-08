import streamlit as st
import os
import json
from datetime import datetime
import plotly.graph_objects as go

# --- IMPORT MODULES ---
from scoring_engine import DeepTechScorer
from parsers import ResumeParser, WebResumeParser, ResearchParser, EngagementCrawler
from matcher import SemanticMatcher

# --- SETUP ---
OUTPUT_DIR = "output"
os.makedirs(OUTPUT_DIR, exist_ok=True)

@st.cache_resource
def load_matcher():
    return SemanticMatcher()

def save_json(data, prefix):
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"{OUTPUT_DIR}/{prefix}_{ts}.json"
    with open(filename, "w", encoding='utf-8') as f:
        json.dump(data, f, indent=4)
    return filename

st.set_page_config(page_title="DeepTech Content View", layout="wide")
st.title("🚀 DeepTech Scorer: Content Intelligence")

# --- SIDEBAR ---
with st.sidebar:
    st.header("⚙️ Configuration")
    api_key = st.text_input("Gemini API Key", type="password")
    
    st.markdown("---")
    st.header("🎯 Job Fit")
    job_desc = st.text_area("Job Description (JD)", height=150)
    
    st.markdown("---")
    st.header("📊 Platform Metrics")
    contracts_completed = st.number_input("Contracts Completed", value=15)
    on_time_rate = st.slider("On-Time Rate", 0.0, 1.0, 0.95)
    milestone_rate = st.slider("Milestone Rate", 0.0, 1.0, 0.90)
    avg_rating = st.slider("Avg Rating", 0.0, 5.0, 4.5)
    vetting_level = st.selectbox("Vetting Level", ["general", "advanced", "deep_tech_verified"])

if not api_key:
    st.warning("Please enter Gemini API Key to start.")
    st.stop()

# Initialize Engines
scorer = DeepTechScorer()
matcher = load_matcher()
p_resume = ResumeParser(api_key)
p_web = WebResumeParser(api_key)
p_research = ResearchParser(api_key)
p_crawler = EngagementCrawler(api_key)

# --- GLOBAL STATE MANAGEMENT ---

def reset_candidate_data():
    """Completely wipes candidate data to prevent mixing."""
    st.session_state.candidate_data = {
        "source": "None", # Track source type
        "name": "Unknown", "full_text": "", "years_experience": 0.0,
        "skills": [], "skill_count": 0, "certifications": [],
        "certification_count": 0, "projects": [], 
        "paper_count": 0, "patent_count": 0, "research_titles": [], "research_summary": "",
        "blog_post_count": 0, "community_answers": 0, "upvotes": 0,
        "top_topics": [], "engagement_summary": ""
    }

if 'candidate_data' not in st.session_state:
    reset_candidate_data()

# File tracker for auto-reset
if 'last_uploaded_filename' not in st.session_state:
    st.session_state.last_uploaded_filename = None

def set_candidate_data(new_data, source_type):
    """
    OVERWRITES existing data with new data. 
    Does NOT merge. This ensures 1 candidate at a time.
    """
    reset_candidate_data() # Wipe first
    
    cd = st.session_state.candidate_data
    cd.update({
        "source": source_type,
        "name": new_data.get("name", "Unknown"),
        "full_text": new_data.get("full_text", ""), # Store context for matching
        "years_experience": float(new_data.get("years_experience", 0)),
        "skills": new_data.get("skills", []),
        "skill_count": len(new_data.get("skills", [])),
        "certifications": new_data.get("certifications", []),
        "certification_count": new_data.get("certification_count", 0),
        "projects": new_data.get("projects", [])
    })

col1, col2 = st.columns([6, 4])

with col1:
    st.subheader("1. Data Processing")
    tab1, tab2, tab3, tab4 = st.tabs(["📄 Resume (PDF)", "🌐 Resume (Web)", "🔬 Research (PDF)", "📢 Engagement"])
    
    # --- 1. FILE RESUME (Auto-Reset) ---
    with tab1:
        uploaded_file = st.file_uploader("Upload Resume", type=["pdf", "docx", "txt"])
        current_filename = uploaded_file.name if uploaded_file else None

        # DETECT CHANGE: If file removed OR file changed -> WIPE DATA
        if current_filename != st.session_state.last_uploaded_filename:
            reset_candidate_data()
            st.session_state.last_uploaded_filename = current_filename
            st.rerun() 

        if uploaded_file and st.button("Analyze Resume File"):
            with st.spinner("Processing PDF..."):
                file_ext = uploaded_file.name.split('.')[-1].lower()
                raw_text = p_resume.extract_text(uploaded_file, file_ext)
                
                if raw_text:
                    gemini_data = p_resume.parse(raw_text)
                    semantic_skills = matcher.extract_skills_semantic(raw_text)
                    
                    # Prepare Data Packet
                    data_packet = {
                        "name": gemini_data.get("name"),
                        "full_text": raw_text, # Save text for JD Matching
                        "years_experience": gemini_data.get("years_experience", 0),
                        "skills": list(set(gemini_data.get("skills", []) + semantic_skills)),
                        "certifications": gemini_data.get("certifications", []),
                        "projects": gemini_data.get("projects", [])
                    }
                    
                    # OVERWRITE MODE
                    set_candidate_data(data_packet, source_type="PDF Resume")
                    st.success(f"PDF Analyzed: {gemini_data.get('name')}")
                else:
                    st.error("Failed to extract text.")

    # --- 2. WEB RESUME ---
    with tab2:
        st.caption("⚠️ Analyzing a Web Profile will REPLACE the current PDF data.")
        url = st.text_input("Portfolio / LinkedIn URL")
        
        if url and st.button("Process Web Profile"):
            with st.spinner("Scraping Web Profile..."):
                # Fetch Data
                gemini_data = p_web.parse(url)
                
                # OVERWRITE MODE
                # Note: Web resume parser doesn't return full text in the JSON usually, 
                # so 'full_text' might be empty unless we pass it. 
                # Ideally, we rely on skills for JD matching if full_text is missing.
                set_candidate_data(gemini_data, source_type="Web Resume")
                
                st.success(f"Web Profile Loaded: {gemini_data.get('name')}")

    # --- 3. RESEARCH ---
    with tab3:
        st.markdown("### 🔬 Research Content")
        uploaded_research = st.file_uploader("Upload Research Paper (PDF)", type=["pdf"])
        if uploaded_research and st.button("Analyze Research PDF"):
            with st.spinner("Extracting..."):
                data = p_research.parse(uploaded_research)
                # Research adds to the profile, doesn't replace identity
                st.session_state.candidate_data.update({
                    "paper_count": data.get("paper_count", 0),
                    "patent_count": data.get("patent_count", 0),
                    "research_titles": data.get("titles", []),
                    "research_summary": data.get("summary", "")
                })
                st.success("Research Data Added to Profile")

    # --- 4. ENGAGEMENT ---
    with tab4:
        e_url = st.text_input("Blog / GitHub URL")
        if e_url and st.button("Crawl Engagement"):
            with st.spinner("Crawling..."):
                data = p_crawler.parse(e_url)
                # Engagement adds to the profile
                st.session_state.candidate_data.update({
                    "blog_post_count": data.get("blog_post_count", 0),
                    "community_answers": data.get("community_answers", 0),
                    "upvotes": data.get("upvotes", 0),
                    "top_topics": data.get("top_topics", []),
                    "engagement_summary": data.get("engagement_summary", "")
                })
                st.success("Engagement Data Added to Profile")

    with st.expander("🗑️ Force Clear Data"):
        if st.button("Clear All Data"):
            reset_candidate_data()
            st.session_state.last_uploaded_filename = None
            st.rerun()

with col2:
    st.subheader("2. DeepTech Scoring Engine")
    
    cd = st.session_state.candidate_data
    
    # Show Active Source
    if cd['source'] != "None":
        st.caption(f"**Active Data Source:** {cd['source']}")
    else:
        st.warning("No Candidate Data Loaded")

    # 1. Job Fit
    if job_desc and (cd['full_text'] or cd['skills']):
        # If full_text is empty (Web Resume), use joined skills
        text_for_matching = cd['full_text'] if len(cd['full_text']) > 50 else " ".join(cd['skills'])
        fit_score = matcher.match_job_description(text_for_matching, job_desc)
        st.progress(fit_score / 100, text=f"Job Fit Score: {fit_score}%")
    
    st.divider()

    # Scores
    s_exp = scorer.calculate_expertise_score(
        years_exp=cd['years_experience'], 
        skill_count=cd['skill_count'], 
        cert_count=len(cd['certifications']), # Use calculated length
        paper_count=cd['paper_count'], 
        patent_count=cd['patent_count'],
        product_count=len(cd['projects']), 
        vetting_level=vetting_level
    )
    s_perf = scorer.calculate_performance_score(1.0, on_time_rate, milestone_rate)
    s_rel = scorer.calculate_reliability_score(0, 0, 2, 100)
    s_qual = scorer.calculate_quality_score(avg_rating, 20, 0.98)
    s_eng = scorer.calculate_engagement_score(cd['community_answers'], cd['blog_post_count'], cd['upvotes'])
    
    overall = scorer.calculate_overall_score(s_exp, s_perf, s_rel, s_qual, s_eng)
    tier, badge = scorer.get_tier_and_badge(overall, contracts_completed)
    
    st.markdown("### 🏆 Overall Score")
    st.metric(label="DeepTech Score", value=f"{overall}/100", delta=f"Rank: {tier}")
    st.info(f"**Badge:** {badge}")
    
    st.markdown("### 📊 Score Breakdown")
    c1, c2, c3 = st.columns(3)
    c1.metric("Expertise (25%)", f"{s_exp}")
    c2.metric("Performance (30%)", f"{s_perf}")
    c3.metric("Reliability (25%)", f"{s_rel}")
    c4, c5 = st.columns(2)
    c4.metric("Quality (15%)", f"{s_qual}")
    c5.metric("Engagement (5%)", f"{s_eng}")
    
    fig = go.Figure(data=go.Scatterpolar(
        r=[s_exp, s_perf, s_rel, s_qual, s_eng],
        theta=['Expertise', 'Performance', 'Reliability', 'Quality', 'Engagement'],
        fill='toself'
    ))
    fig.update_layout(polar=dict(radialaxis=dict(visible=True, range=[0, 100])), showlegend=False, height=300, margin=dict(t=30, b=30, l=30, r=30))
    st.plotly_chart(fig, use_container_width=True)
    
    if st.button("💾 Save Final Report JSON"):
        full_report = {
            "metadata": {"generated_at": datetime.now().isoformat()},
            "candidate_profile": cd,
            "scoring_breakdown": {
                "overall_score": overall, "tier": tier, "badge": badge,
                "components": {"expertise": s_exp, "performance": s_perf, "reliability": s_rel, "quality": s_qual, "engagement": s_eng}
            }
        }
        path = save_json(full_report, f"DeepTech_Report_{cd['name'].replace(' ', '_')}")
        st.success(f"Report saved to: {path}")