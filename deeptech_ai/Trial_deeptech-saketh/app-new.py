import streamlit as st
import os
import json
from datetime import datetime
import plotly.graph_objects as go
import numpy as np

# --- IMPORT MODULES ---
from scoring_engine import DeepTechScorer
from ai_scorer import AIScorer
from parsers import ResumeParser, WebResumeParser, ResearchParser, GitHubParser, EngagementCrawler
from matcher import SemanticMatcher
from aggregator import DocumentAggregator

# --- SETUP ---
OUTPUT_DIR = "output"
os.makedirs(OUTPUT_DIR, exist_ok=True)

@st.cache_resource
def load_matcher():
    return SemanticMatcher()

@st.cache_resource
def load_aggregator():
    return DocumentAggregator()

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
    api_key = st.text_input("Gemini API Key", type="password", value=os.getenv("GEMINI_API_KEY", ""))
    github_token = st.text_input("GitHub Token (Optional)", type="password", help="For higher API rate limits")
    
    st.markdown("---")
    st.header("🤖 Scoring Method")
    scoring_method = st.radio(
        "Choose Scoring Engine:",
        ["🧠 AI-Based (LLM)", "📊 Rule-Based (Traditional)"],
        help="AI uses Gemini to evaluate holistically. Rule-based uses predefined formulas."
    )
    use_ai_scoring = scoring_method.startswith("🧠")
    
    st.markdown("---")
    st.header("🎯 Job Fit")
    job_desc = st.text_area("Job Description (JD)", height=150)
    
    st.markdown("---")
    st.header("📊 Platform Metrics")
    st.caption("⚠️ Demo values - will fetch from DB later")
    contracts_completed = st.number_input("Contracts Completed", 0, 500, 15)
    on_time_rate = st.slider("On-Time Rate", 0.0, 1.0, 0.95)
    milestone_rate = st.slider("Milestone Rate", 0.0, 1.0, 0.90)
    avg_rating = st.slider("Avg Rating", 0.0, 5.0, 4.5)
    vetting_level = st.selectbox("Vetting Level", ["general", "advanced", "deep_tech_verified"])
    
    st.markdown("---")
    st.header("🔒 Reliability Metrics")
    dispute_rate = st.slider("Dispute Rate", 0.0, 1.0, 0.0)
    cancel_rate = st.slider("Cancellation Rate", 0.0, 1.0, 0.0)
    response_hours = st.slider("Avg Response Time (hrs)", 0, 48, 2)

if not api_key:
    st.warning("Please enter Gemini API Key to start.")
    st.stop()

# Initialize Engines
scorer = DeepTechScorer()
matcher = load_matcher()
aggregator = load_aggregator()
p_resume = ResumeParser(api_key)
p_web = WebResumeParser(api_key)
p_research = ResearchParser(api_key)
p_github = GitHubParser(api_key, github_token if github_token else None)
p_crawler = EngagementCrawler(api_key)

# Global State - Multi-Document Support
if 'documents' not in st.session_state:
    st.session_state.documents = []  # List of all uploaded/processed documents

if 'document_embeddings' not in st.session_state:
    st.session_state.document_embeddings = []  # SentenceTransformer embeddings

if 'aggregated_profile' not in st.session_state:
    st.session_state.aggregated_profile = aggregator._empty_profile()

if 'candidate_data' not in st.session_state:
    # Keep for backward compatibility - will be replaced by aggregated_profile
    st.session_state.candidate_data = aggregator._empty_profile()

col1, col2 = st.columns([6, 4])

with col1:
    st.subheader("1. Data Collection")
    st.caption(f"📦 {len(st.session_state.documents)} document(s) processed | Fill all sections below, then click Analyze")
    
    # --- 1. PDF RESUME ---
    st.markdown("### 📄 Resume(s)")
    uploaded_files = st.file_uploader("Upload PDF Resume(s)", type=["pdf"], accept_multiple_files=True, key="resume_upload")
    if uploaded_files:
        st.info(f"📎 {len(uploaded_files)} resume(s) ready for processing")
    
    st.divider()
    
    # --- 2. PORTFOLIO ---
    st.markdown("### 🌐 Portfolio/Website")
    portfolio_url = st.text_input("Portfolio URL (LinkedIn, personal site, etc.)", key="portfolio_url")
    
    st.divider()
    
    # --- 3. RESEARCH ---
    st.markdown("### 🔬 Research Publications")
    research_text = st.text_area("Paste List of Papers / Patents / Publications", key="research_text", height=120)
    
    st.divider()
    
    # --- 4. GITHUB ---
    st.markdown("### 💻 GitHub Profile")
    github_input = st.text_input("GitHub Username or Profile URL", key="github_input")
    
    st.divider()
    
    # --- MAIN ANALYZE BUTTON ---
    analyze_button = st.button("🚀 ANALYZE ALL DATA", type="primary", width="stretch")
    
    if analyze_button:
        # Clear previous documents
        st.session_state.documents = []
        st.session_state.document_embeddings = []
        
        progress_bar = st.progress(0)
        status_text = st.empty()
        total_steps = 4
        current_step = 0
        
        # --- PROCESS RESUMES ---
        if uploaded_files:
            status_text.text("📄 Processing resumes...")
            try:
                for uploaded_file in uploaded_files:
                    raw_text = p_resume.extract_text(uploaded_file.read())
                    if len(raw_text.strip()) >= 100:
                        gemini_data = p_resume.parse(raw_text)
                        semantic_skills = matcher.extract_skills_semantic(raw_text)
                        combined_skills = list(set(gemini_data.get("skills", []) + semantic_skills))
                        
                        doc_record = {
                            "source_type": "resume",
                            "source_name": uploaded_file.name,
                            "name": gemini_data.get("name", "Unknown"),
                            "full_text": raw_text,
                            "years_experience": gemini_data.get("years_experience", 0),
                            "skills": combined_skills,
                            "skill_count": len(combined_skills),
                            "certifications": gemini_data.get("certifications", []),
                            "certification_count": gemini_data.get("certification_count", 0)
                        }
                        
                        embedding = matcher.encode_document(raw_text)
                        st.session_state.documents.append(doc_record)
                        st.session_state.document_embeddings.append(embedding)
            except Exception as e:
                st.error(f"❌ Resume processing error: {str(e)}")
        current_step += 1
        progress_bar.progress(current_step / total_steps)
        
        # --- PROCESS PORTFOLIO ---
        if portfolio_url:
            status_text.text("🌐 Analyzing portfolio...")
            try:
                gemini_data = p_web.parse(portfolio_url)
                if "error" not in gemini_data:
                    doc_record = {
                        "source_type": "portfolio",
                        "source_name": portfolio_url,
                        "name": gemini_data.get("name", "Unknown"),
                        "full_text": gemini_data.get("full_text", ""),
                        "years_experience": gemini_data.get("years_experience", 0),
                        "skills": gemini_data.get("skills", []),
                        "skill_count": len(gemini_data.get("skills", [])),
                        "certifications": gemini_data.get("certifications", []),
                        "certification_count": gemini_data.get("certification_count", 0)
                    }
                    embedding = matcher.encode_document(gemini_data.get("full_text", ""))
                    st.session_state.documents.append(doc_record)
                    st.session_state.document_embeddings.append(embedding)
            except Exception as e:
                st.warning(f"⚠️ Portfolio analysis failed: {str(e)}")
        current_step += 1
        progress_bar.progress(current_step / total_steps)
        
        # --- PROCESS RESEARCH ---
        if research_text:
            status_text.text("🔬 Extracting research data...")
            try:
                data = p_research.parse(research_text)
                doc_record = {
                    "source_type": "research",
                    "source_name": "Research Publications",
                    "full_text": data.get("full_text", research_text),
                    "paper_count": data.get("paper_count", 0),
                    "patent_count": data.get("patent_count", 0),
                    "research_titles": data.get("titles", []),
                    "research_summary": data.get("summary", ""),
                    "skills": data.get("skills", []) + data.get("technologies", []),  # Include research skills
                    "research_domains": data.get("research_domains", []),
                    "authors": data.get("authors", [])
                }
                embedding = matcher.encode_document(data.get("full_text", research_text))
                st.session_state.documents.append(doc_record)
                st.session_state.document_embeddings.append(embedding)
            except Exception as e:
                st.warning(f"⚠️ Research analysis failed: {str(e)}")
        current_step += 1
        progress_bar.progress(current_step / total_steps)
        
        # --- PROCESS GITHUB ---
        if github_input:
            status_text.text("💻 Fetching GitHub data...")
            try:
                data = p_github.parse(github_input)
                if "error" not in data:
                    doc_record = {
                        "source_type": "github",
                        "source_name": data.get("profile_url", github_input),
                        "full_text": data.get("github_summary", "") + " " + data.get("github_bio", ""),
                        "skills": data.get("skills", data.get("github_languages", [])),
                        "github_repos": data.get("github_repos", 0),
                        "github_stars": data.get("github_stars", 0),
                        "github_forks": data.get("github_forks", 0),
                        "github_commits": data.get("github_commits", 0),
                        "github_followers": data.get("github_followers", 0),
                        "github_languages": data.get("github_languages", []),
                        "top_projects": data.get("top_projects", []),
                        "top_topics": data.get("top_topics", data.get("github_languages", [])),
                        "account_age_years": data.get("account_age_years", 0)
                    }
                    embedding = matcher.encode_document(doc_record["full_text"])
                    st.session_state.documents.append(doc_record)
                    st.session_state.document_embeddings.append(embedding)
                else:
                    st.warning(f"⚠️ GitHub: {data.get('error', 'Unknown error')}")
            except Exception as e:
                st.warning(f"⚠️ GitHub analysis failed: {str(e)}")
        current_step += 1
        progress_bar.progress(1.0)
        
        # --- AGGREGATE & FINALIZE ---
        if st.session_state.documents:
            status_text.text("🔄 Aggregating all data...")
            st.session_state.aggregated_profile = aggregator.aggregate_profile(st.session_state.documents)
            st.session_state.candidate_data = st.session_state.aggregated_profile
            save_json(st.session_state.aggregated_profile, "aggregated_profile")
            
            progress_bar.empty()
            status_text.empty()
            
            st.success(f"✅ Analysis Complete! Processed {len(st.session_state.documents)} source(s)")
            
            # Show summary
            with st.expander("📊 Processing Summary", expanded=True):
                col_s1, col_s2, col_s3 = st.columns(3)
                with col_s1:
                    st.metric("Total Skills", st.session_state.aggregated_profile.get('skill_count', 0))
                with col_s2:
                    st.metric("Experience", f"{st.session_state.aggregated_profile.get('years_experience', 0)} years")
                with col_s3:
                    st.metric("Sources", len(st.session_state.documents))
                
                if st.session_state.aggregated_profile.get('skills'):
                    st.markdown("**Top Skills:**")
                    st.write(", ".join(st.session_state.aggregated_profile['skills'][:15]))
        else:
            progress_bar.empty()
            status_text.empty()
            st.error("❌ No data provided. Please fill at least one section above.")

with col2:
    st.subheader("2. DeepTech Scoring")
    
    cd = st.session_state.aggregated_profile
    docs = st.session_state.documents
    
    # Initialize variables with defaults
    semantic_score = None
    avg_quality = None
    coherence = None
    
    # Document Coverage Indicator
    if docs:
        st.info(f"📦 **{len(docs)} source(s):** {', '.join(set(d.get('source_type', '?') for d in docs))}")
    
    # Job Fit with Semantic Scoring
    if job_desc and cd.get('full_text'):
        # Traditional match
        fit_score = matcher.match_job_description(cd['full_text'], job_desc)
        st.markdown(f"**Traditional Job Match:** {fit_score}%")
        st.progress(fit_score / 100)
        
        # Semantic Analysis (if multiple documents)
        if len(st.session_state.document_embeddings) > 0:
            st.divider()
            st.markdown("### 🧠 Semantic Analysis")
            
            # Calculate document quality scores
            quality_scores = [matcher.score_document_quality(doc.get('full_text', '')) for doc in docs]
            avg_quality = np.mean(quality_scores) if quality_scores else 0
            
            # Calculate coherence
            coherence = matcher.calculate_profile_coherence(st.session_state.document_embeddings)
            
            # Calculate aggregated embedding
            agg_embedding = aggregator.calculate_semantic_centroid(st.session_state.document_embeddings)
            jd_embedding = matcher.encode_document(job_desc)
            
            # Final semantic score
            semantic_score = matcher.semantic_overall_score(
                agg_embedding, jd_embedding, quality_scores, coherence
            )
            
            col_sem1, col_sem2, col_sem3 = st.columns(3)
            with col_sem1:
                st.metric("Doc Quality", f"{avg_quality:.0f}%")
            with col_sem2:
                st.metric("Coherence", f"{coherence:.0f}%")
            with col_sem3:
                st.metric("Semantic Fit", f"{semantic_score:.0f}%")
    
    st.divider()

    # --- SCORING SECTION ---
    if use_ai_scoring:
        # ===== AI-BASED SCORING =====
        st.markdown("### 🧠 AI-Based Evaluation")
        
        if not api_key:
            st.warning("⚠️ API Key required for AI scoring")
        else:
            with st.spinner("🤖 AI analyzing candidate..."):
                try:
                    ai_scorer = AIScorer(api_key)
                    ai_scores = ai_scorer.score_candidate(
                        candidate_profile=cd,
                        job_description=job_desc,
                        contracts_count=contracts_completed
                    )
                    
                    # Admin Recommendation Section (NEW FORMAT)
                    admin_rec = ai_scores.get('admin_recommendation', {})
                    
                    # Overall Score
                    st.metric("AI Overall Score", f"{ai_scores['overall_score']:.1f}/100")
                    
                    # ADMIN RECOMMENDATION - Primary Display
                    if admin_rec:
                        decision = admin_rec.get('decision', 'CONSIDER')
                        priority = admin_rec.get('hiring_priority', 'MEDIUM')
                        
                        # Decision Badge with color coding
                        if 'STRONGLY' in decision:
                            st.success(f"✅ **DECISION:** {decision} | **PRIORITY:** {priority}")
                        elif decision == 'RECOMMEND':
                            st.info(f"👍 **DECISION:** {decision} | **PRIORITY:** {priority}")
                        elif decision == 'CONSIDER':
                            st.warning(f"🤔 **DECISION:** {decision} | **PRIORITY:** {priority}")
                        else:
                            st.error(f"❌ **DECISION:** {decision} | **PRIORITY:** {priority}")
                        
                        # Recommended Roles & Projects
                        col_role, col_proj = st.columns(2)
                        with col_role:
                            st.markdown("**🎯 Recommended Roles:**")
                            for role in admin_rec.get('recommended_roles', []):
                                st.markdown(f"- {role}")
                        with col_proj:
                            st.markdown("**💼 Best Fit Projects:**")
                            for project in admin_rec.get('best_fit_projects', []):
                                st.markdown(f"- {project}")
                        
                        # Justification
                        st.markdown("**📋 Hiring Justification:**")
                        st.write(admin_rec.get('justification', ''))
                        
                        # Key Highlights
                        col_exp, col_growth = st.columns(2)
                        with col_exp:
                            st.markdown("**🌟 Experience Highlights:**")
                            for highlight in admin_rec.get('experience_highlights', []):
                                st.markdown(f"- {highlight}")
                        with col_growth:
                            st.markdown("**📈 Areas for Growth:**")
                            for area in admin_rec.get('areas_for_growth', []):
                                st.markdown(f"- {area}")
                        
                        # Interview Focus
                        st.markdown("**❓ Suggested Interview Focus:**")
                        for topic in admin_rec.get('suggested_interview_focus', []):
                            st.markdown(f"- {topic}")
                        
                        st.divider()
                    else:
                        # Fallback to old format if no admin_recommendation
                        st.info(f"**Recommendation:** {ai_scores['recommendation']}")
                        st.caption(f"Predicted Tier: {ai_scores.get('tier_prediction', 'Unknown')}")
                    
                    # Dimension Scores with Reasoning
                    st.markdown("#### 📊 Detailed Breakdown")
                    
                    dimensions = [
                        ("Expertise", ai_scores['expertise_score'], ai_scores['expertise_reasoning'], "25%"),
                        ("Performance", ai_scores['performance_score'], ai_scores['performance_reasoning'], "30%"),
                        ("Reliability", ai_scores['reliability_score'], ai_scores['reliability_reasoning'], "25%"),
                        ("Quality", ai_scores['quality_score'], ai_scores['quality_reasoning'], "15%"),
                        ("Engagement", ai_scores['engagement_score'], ai_scores['engagement_reasoning'], "5%")
                    ]
                    
                    for dim_name, score, reasoning, weight in dimensions:
                        with st.expander(f"**{dim_name}** ({weight}): {score:.0f}/100"):
                            st.write(reasoning)
                    
                    # Radar Chart
                    fig = go.Figure(data=go.Scatterpolar(
                        r=[ai_scores['expertise_score'], ai_scores['performance_score'], 
                           ai_scores['reliability_score'], ai_scores['quality_score'], ai_scores['engagement_score']],
                        theta=['Expertise (25%)', 'Performance (30%)', 'Reliability (25%)', 'Quality (15%)', 'Engagement (5%)'],
                        fill='toself',
                        name='AI Scores'
                    ))
                    fig.update_layout(polar=dict(radialaxis=dict(visible=True, range=[0, 100])), showlegend=False, height=400)
                    st.plotly_chart(fig, width="stretch")
                    
                    # Key Strengths from Admin Recommendation
                    if admin_rec and admin_rec.get('key_strengths'):
                        st.markdown("**💪 Key Strengths (Evidence-Based):**")
                        for strength in admin_rec['key_strengths']:
                            st.markdown(f"- {strength}")
                    else:
                        # Fallback to old strengths/weaknesses
                        col_sw1, col_sw2 = st.columns(2)
                        with col_sw1:
                            st.markdown("**✅ Strengths:**")
                            for strength in ai_scores.get('strengths', []):
                                st.markdown(f"- {strength}")
                        with col_sw2:
                            st.markdown("**⚠️ Areas to Improve:**")
                            for weakness in ai_scores.get('weaknesses', []):
                                st.markdown(f"- {weakness}")
                    
                    # Save Report
                    if st.button("💾 Save AI Report"):
                        report = {
                            "profile": cd,
                            "ai_scores": ai_scores,
                            "documents": [
                                {
                                    "source_type": doc.get("source_type"),
                                    "source_name": doc.get("source_name"),
                                    "key_metrics": {
                                        "skills": doc.get("skills", [])[:10],
                                        "years_experience": doc.get("years_experience", 0)
                                    }
                                } for doc in st.session_state.documents
                            ],
                            "scoring_method": "AI (Gemini 2.0 Flash)",
                            "timestamp": ai_scores['timestamp']
                        }
                        path = save_json(report, "AI_REPORT")
                        st.success(f"Saved to {path}")
                
                except Exception as e:
                    st.error(f"❌ AI Scoring Error: {str(e)}")
                    st.info("💡 Try switching to Rule-Based scoring or check your API key")
    
    else:
        # ===== RULE-BASED SCORING =====
        st.markdown("### 📊 Rule-Based Scoring")
        
        # Scores
        s_exp = scorer.calculate_expertise_score(
            cd['years_experience'], cd['skill_count'], cd['certification_count'],
            cd['paper_count'] + cd['patent_count'], vetting_level
        )
        s_perf = scorer.calculate_performance_score(1.0, on_time_rate, milestone_rate)
        s_rel = scorer.calculate_reliability_score(dispute_rate, cancel_rate, response_hours)
        s_qual = scorer.calculate_quality_score(avg_rating, 20, 0.98)
        
        # Enhanced engagement score with GitHub
        github_bonus = min(cd.get('github_repos', 0) * 2, 20) + min(cd.get('github_stars', 0) / 10, 15)
        s_eng_base = scorer.calculate_engagement_score(
            cd.get('community_answers', 0), 
            cd.get('blog_post_count', 0), 
            cd.get('upvotes', 0)
        )
        s_eng = min(s_eng_base + github_bonus, 100)
        
        # Document coverage bonus (0-20 points)
        coverage_bonus = aggregator.calculate_document_coverage_score(st.session_state.documents)
        
        overall = scorer.calculate_overall_score(s_exp, s_perf, s_rel, s_qual, s_eng)
        overall_with_bonus = min(overall + (coverage_bonus * 0.1), 100)  # Add 10% of coverage bonus
        tier, badge = scorer.get_tier_and_badge(overall_with_bonus, contracts_completed)
        
        st.metric("DeepTech Score", f"{overall_with_bonus:.1f}/100")
        if coverage_bonus > 0:
            st.caption(f"⬆️ +{coverage_bonus * 0.1:.1f} pts from {len(st.session_state.documents)} source diversity")
        st.info(f"{tier} | {badge}")
        
        # Breakdown
        fig = go.Figure(data=go.Scatterpolar(
            r=[s_exp, s_perf, s_rel, s_qual, s_eng],
            theta=['Expertise (25%)', 'Performance (30%)', 'Reliability (25%)', 'Quality (15%)', 'Engagement (5%)'],
            fill='toself'
        ))
        fig.update_layout(polar=dict(radialaxis=dict(visible=True, range=[0, 100])), showlegend=False)
        st.plotly_chart(fig, width="stretch")
        
        # Save Report
        if st.button("💾 Save Final Report"):
            report = {
                "profile": cd,
                "documents": [
                    {
                        "source_type": doc.get("source_type"),
                        "source_name": doc.get("source_name"),
                        "key_metrics": {
                            "skills": doc.get("skills", [])[:10],
                            "years_experience": doc.get("years_experience", 0)
                        }
                    } for doc in st.session_state.documents
                ],
                "scores": {
                    "overall": overall_with_bonus,
                    "base_score": overall,
                    "coverage_bonus": coverage_bonus,
                    "expertise": s_exp,
                    "performance": s_perf,
                    "reliability": s_rel,
                    "quality": s_qual,
                    "engagement": s_eng,
                    "semantic_fit": semantic_score
                },
                "rank": tier,
                "badge": badge,
                "extracted_content": {
                    "research": cd.get("research_titles"),
                    "topics": cd.get("top_topics"),
                    "github_languages": cd.get("github_languages", [])
                },
                "analysis": {
                    "document_count": len(st.session_state.documents),
                    "source_types": list(set(doc.get('source_type', 'unknown') for doc in st.session_state.documents)),
                    "document_quality": avg_quality,
                    "coherence_score": coherence
                },
                "scoring_method": "Rule-Based (Traditional)"
            }
            path = save_json(report, "FINAL_REPORT")
            st.success(f"Saved to {path}")