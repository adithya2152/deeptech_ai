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
    contracts_completed = st.number_input("Contracts Completed", 15)
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

# Global State
if 'candidate_data' not in st.session_state:
    st.session_state.candidate_data = {
        "name": "Unknown",
        "full_text": "",
        "years_experience": 0,
        "skills": [],
        "skill_count": 0,
        "certification_count": 0,
        
        # Research Content
        "paper_count": 0,
        "patent_count": 0,
        "research_titles": [],
        "research_summary": "",
        
        # Engagement Content
        "blog_post_count": 0,
        "community_answers": 0,
        "upvotes": 0,
        "top_topics": [],
        "engagement_summary": ""
    }

col1, col2 = st.columns([6, 4])

with col1:
    st.subheader("1. Data Processing")
    
    tab1, tab2, tab3, tab4 = st.tabs(["📄 PDF Resume", "🌐 Web Resume", "🔬 Research", "📢 Engagement"])
    
    # --- 1. PDF RESUME ---
    with tab1:
        uploaded_file = st.file_uploader("Upload PDF Resume", type=["pdf"])
        if uploaded_file and st.button("Analyze PDF"):
            with st.spinner("Processing..."):
                raw_text = p_resume.extract_text(uploaded_file.read())
                gemini_data = p_resume.parse(raw_text)
                semantic_skills = matcher.extract_skills_semantic(raw_text)
                
                combined_skills = list(set(gemini_data.get("skills", []) + semantic_skills))
                
                st.session_state.candidate_data.update({
                    "name": gemini_data.get("name"),
                    "full_text": raw_text,
                    "years_experience": gemini_data.get("years_experience", 0),
                    "skills": combined_skills,
                    "skill_count": len(combined_skills),
                    "certification_count": gemini_data.get("certification_count", 0)
                })
                
                save_json(st.session_state.candidate_data, "resume_processed")
                st.success("Resume Analyzed")
                st.write(f"**Identified Skills:** {', '.join(combined_skills[:15])}...")

    # --- 2. WEB RESUME ---
    with tab2:
        url = st.text_input("Portfolio URL")
        if url and st.button("Process Web Profile"):
            gemini_data = p_web.parse(url)
            st.session_state.candidate_data.update({
                "name": gemini_data.get("name"),
                "years_experience": gemini_data.get("years_experience", 0),
                "skill_count": gemini_data.get("skill_count", 0),
            })
            st.success("Web Profile Updated")

    # --- 3. RESEARCH (CONTENT VIEW) ---
    with tab3:
        st.markdown("### 🔬 Research Content Extraction")
        txt = st.text_area("Paste List of Papers / Patents")
        if txt and st.button("Analyze Research Content"):
            with st.spinner("Extracting Titles & Impact..."):
                data = p_research.parse(txt)
                
                st.session_state.candidate_data.update({
                    "paper_count": data.get("paper_count", 0),
                    "patent_count": data.get("patent_count", 0),
                    "research_titles": data.get("titles", []),
                    "research_summary": data.get("summary", "")
                })
                
                # --- CONTENT DISPLAY ---
                st.success("Extraction Complete")
                
                # Summary Card
                st.info(f"**Research Focus:** {data.get('summary', 'No summary available')}")
                
                # Titles List
                if data.get("titles"):
                    st.markdown("#### 📚 Extracted Titles:")
                    for idx, title in enumerate(data.get("titles"), 1):
                        st.markdown(f"**{idx}.** *{title}*")
                else:
                    st.warning("No specific paper titles extracted.")

    # --- 4. ENGAGEMENT (CONTENT VIEW) ---
    with tab4:
        st.markdown("### 📢 Community Content")
        e_url = st.text_input("Blog / StackOverflow / GitHub URL")
        if e_url and st.button("Crawl & Summarize"):
            with st.spinner("Crawling & Summarizing..."):
                data = p_crawler.parse(e_url)
                
                st.session_state.candidate_data.update({
                    "blog_post_count": data.get("blog_post_count", 0),
                    "community_answers": data.get("community_answers", 0),
                    "upvotes": data.get("upvotes", 0),
                    "top_topics": data.get("top_topics", []),
                    "engagement_summary": data.get("engagement_summary", "")
                })
                
                # --- CONTENT DISPLAY ---
                st.success("Content Analyzed")
                
                # Summary Card
                st.info(f"**Activity Summary:** {data.get('engagement_summary', 'No summary available')}")
                
                # Topics & Latest Post
                col_a, col_b = st.columns(2)
                with col_a:
                    st.markdown("#### 🗣️ Top Topics:")
                    if data.get("top_topics"):
                        for topic in data.get("top_topics"):
                            st.badge(topic)
                    else:
                        st.write("N/A")
                        
                with col_b:
                    st.markdown("#### 📝 Latest Post:")
                    st.write(data.get("latest_post_title", "N/A"))

with col2:
    st.subheader("2. DeepTech Scoring")
    
    cd = st.session_state.candidate_data
    
    # Job Fit
    if job_desc and cd['full_text']:
        fit_score = matcher.match_job_description(cd['full_text'], job_desc)
        st.markdown(f"**Job Match:** {fit_score}%")
        st.progress(fit_score / 100)
    
    st.divider()

    # Scores
    s_exp = scorer.calculate_expertise_score(
        cd['years_experience'], cd['skill_count'], cd['certification_count'],
        cd['paper_count'] + cd['patent_count'], vetting_level
    )
    s_perf = scorer.calculate_performance_score(1.0, on_time_rate, milestone_rate)
    s_rel = scorer.calculate_reliability_score(0, 0, 2)
    s_qual = scorer.calculate_quality_score(avg_rating, 20, 0.98)
    s_eng = scorer.calculate_engagement_score(cd['community_answers'], cd['blog_post_count'], cd['upvotes'])
    
    overall = scorer.calculate_overall_score(s_exp, s_perf, s_rel, s_qual, s_eng)
    tier, badge = scorer.get_tier_and_badge(overall, contracts_completed)
    
    st.metric("DeepTech Score", f"{overall}/100")
    st.info(f"{tier} | {badge}")
    
    # Breakdown
    fig = go.Figure(data=go.Scatterpolar(
        r=[s_exp, s_perf, s_rel, s_qual, s_eng],
        theta=['Expertise (25%)', 'Performance (30%)', 'Reliability (25%)', 'Quality (15%)', 'Engagement (5%)'],
        fill='toself'
    ))
    fig.update_layout(polar=dict(radialaxis=dict(visible=True, range=[0, 100])), showlegend=False)
    st.plotly_chart(fig, use_container_width=True)
    
    # Save Report
    if st.button("💾 Save Final Report"):
        report = {
            "profile": cd,
            "scores": {
                "overall": overall,
                "expertise": s_exp,
                "engagement": s_eng
            },
            "rank": tier,
            "extracted_content": {
                "research": cd.get("research_titles"),
                "topics": cd.get("top_topics")
            }
        }
        path = save_json(report, "FINAL_REPORT")
        st.success(f"Saved to {path}")