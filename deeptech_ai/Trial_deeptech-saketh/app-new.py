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

# Initialize only non-LLM components immediately
scorer = DeepTechScorer()
matcher = load_matcher()
aggregator = load_aggregator()

# Parsers will be initialized when needed (no API key required for extraction)
# AI Scorer will only be initialized when analysis is requested

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
    col_btn1, col_btn2 = st.columns([3, 1])
    with col_btn1:
        analyze_button = st.button("🚀 ANALYZE ALL DATA", type="primary", width="stretch")
    with col_btn2:
        if st.button("🔄 Reset", width="stretch"):
            # Clear all analysis data
            st.session_state.documents = []
            st.session_state.document_embeddings = []
            st.session_state.aggregated_profile = {}
            st.session_state.candidate_data = {}
            st.session_state.analysis_complete = False
            if 'ai_analysis_result' in st.session_state:
                del st.session_state.ai_analysis_result
            st.rerun()
    
    if analyze_button:
        # Clear previous analysis
        st.session_state.documents = []
        st.session_state.document_embeddings = []
        st.session_state.analysis_complete = False
        if 'ai_analysis_result' in st.session_state:
            del st.session_state.ai_analysis_result
        
        # Initialize parsers (NO LLM calls - pure extraction)
        p_resume = ResumeParser()
        p_web = WebResumeParser()
        p_research = ResearchParser()
        p_github = GitHubParser(github_token if github_token else None)
        p_crawler = EngagementCrawler()
        
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
                        # Only extract text, let LLM do the parsing later
                        doc_record = {
                            "source_type": "resume",
                            "source_name": uploaded_file.name,
                            "raw_text": raw_text,
                            "char_count": len(raw_text),
                            "extraction_method": "pymupdf"
                        }
                        
                        embedding = matcher.encode_document(raw_text)
                        st.session_state.documents.append(doc_record)
                        st.session_state.document_embeddings.append(embedding)
                        st.info(f"✅ Resume: Extracted {len(raw_text)} chars from {uploaded_file.name}")
            except Exception as e:
                st.error(f"❌ Resume processing error: {str(e)}")
        current_step += 1
        progress_bar.progress(current_step / total_steps)
        
        # --- PROCESS PORTFOLIO ---
        if portfolio_url:
            status_text.text("🌐 Extracting portfolio...")
            try:
                parsed_data = p_web.parse(portfolio_url)  # Pure extraction, no LLM
                if "error" not in parsed_data:
                    doc_record = {
                        "source_type": "portfolio",
                        "source_url": portfolio_url,
                        "raw_text": parsed_data.get("raw_text", ""),
                        "char_count": parsed_data.get("char_count", 0),
                        "extraction_method": "trafilatura"
                    }
                    embedding = matcher.encode_document(parsed_data.get("raw_text", ""))
                    st.session_state.documents.append(doc_record)
                    st.session_state.document_embeddings.append(embedding)
            except Exception as e:
                st.warning(f"⚠️ Portfolio extraction failed: {str(e)}")
        current_step += 1
        progress_bar.progress(current_step / total_steps)
        
        # --- PROCESS RESEARCH ---
        if research_text:
            status_text.text("🔬 Extracting research PDF...")
            try:
                parsed_data = p_research.parse(research_text)  # Pure extraction, no LLM
                if "error" not in parsed_data:
                    doc_record = {
                        "source_type": "research",
                        "raw_text": parsed_data.get("raw_text", ""),
                        "title": parsed_data.get("title", "Unknown"),
                        "char_count": parsed_data.get("char_count", 0),
                        "extraction_method": "pymupdf"
                    }
                    embedding = matcher.encode_document(parsed_data.get("raw_text", ""))
                    st.session_state.documents.append(doc_record)
                    st.session_state.document_embeddings.append(embedding)
            except Exception as e:
                st.warning(f"⚠️ Research PDF extraction failed: {str(e)}")
        current_step += 1
        progress_bar.progress(current_step / total_steps)
        
        # --- PROCESS GITHUB ---
        if github_input:
            status_text.text("💻 Fetching GitHub data...")
            try:
                data = p_github.parse(github_input)
                if "error" not in data:
                    # Pure extraction - GitHub API data without LLM
                    doc_record = {
                        "source_type": data.get("source_type", "github"),
                        "source_name": github_input,
                        "username": data.get("username", ""),
                        "name": data.get("name", ""),
                        "bio": data.get("bio", ""),
                        "repos_count": data.get("repos_count", 0),
                        "total_stars": data.get("total_stars", 0),
                        "languages": data.get("languages", {}),
                        "top_repos": data.get("top_repos", []),
                        "created_at": data.get("created_at", ""),
                        "raw_text": f"{data.get('name', '')} {data.get('bio', '')} {', '.join(data.get('languages', {}).keys())}"
                    }
                    embedding = matcher.encode_document(doc_record["raw_text"])
                    st.session_state.documents.append(doc_record)
                    st.session_state.document_embeddings.append(embedding)
                    st.info(f"✅ GitHub: Found {data.get('repos_count', 0)} repos, {data.get('total_stars', 0)} stars, {len(data.get('languages', {}))} languages")
                else:
                    st.warning(f"⚠️ GitHub: {data.get('error', 'Unknown error')}")
            except Exception as e:
                st.warning(f"⚠️ GitHub extraction failed: {str(e)}")
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
        
        # Mark that analysis is complete
        st.session_state.analysis_complete = True

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
        elif not st.session_state.documents:
            st.warning("⚠️ No data collected. AI scoring requires at least one data source.")
        elif not st.session_state.get('analysis_complete', False):
            st.info("👆 Click 'ANALYZE ALL DATA' button above to start processing")
        else:
            # Check if AI scoring already done to prevent re-runs
            if 'ai_analysis_result' not in st.session_state:
                with st.spinner("🤖 AI analyzing complete candidate profile..."):
                    try:
                        # Prepare aggregated data package for single LLM call
                        aggregated_data = {
                            "documents": st.session_state.documents,
                            "metadata": {
                                "total_documents": len(st.session_state.documents),
                                "sources_used": [doc.get("source_type", "unknown") for doc in st.session_state.documents],
                                "contracts_completed": contracts_completed
                            }
                        }
                        
                        # Single comprehensive LLM call
                        ai_scorer = AIScorer(api_key)
                        analysis_result = ai_scorer.analyze_candidate(
                            aggregated_data=aggregated_data,
                            job_description=job_desc
                        )
                        
                        # Store in session state to prevent re-runs
                        st.session_state.ai_analysis_result = analysis_result
                        
                    except Exception as e:
                        st.error(f"❌ AI Scoring Error: {str(e)}")
                        st.info("💡 Try switching to Rule-Based scoring or check your API key")
                        st.session_state.ai_analysis_result = None
            
            # Display results (from session state)
            if st.session_state.get('ai_analysis_result'):
                analysis_result = st.session_state.ai_analysis_result
                
                # Display parsed data section
                st.markdown("#### 📝 Extracted Profile Data")
                parsed_data = analysis_result.get('parsed_data', {})
                col1, col2, col3 = st.columns(3)
                with col1:
                    if parsed_data.get('name'):
                        st.metric("Name", parsed_data['name'])
                    if parsed_data.get('email'):
                        st.metric("Email", parsed_data['email'])
                with col2:
                    if parsed_data.get('phone'):
                        st.metric("Phone", parsed_data['phone'])
                    if parsed_data.get('years_experience'):
                        st.metric("Experience", f"{parsed_data['years_experience']} years")
                with col3:
                    if parsed_data.get('all_skills'):
                        st.metric("Total Skills", len(parsed_data['all_skills']))
                
                st.divider()
                
                # Admin Recommendation Section (PRIMARY DISPLAY)
                admin_rec = analysis_result.get('admin_recommendation', {})
                scores = analysis_result.get('scores', {})
                
                # Overall Score
                st.metric("AI Overall Score", f"{scores.get('overall_score', 0):.1f}/100")
                
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
                        st.markdown("**🌟 Key Strengths:**")
                        for strength in admin_rec.get('key_strengths', []):
                            st.markdown(f"- {strength}")
                        st.markdown("**💡 Experience Highlights:**")
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
                
                # Dimension Scores with Reasoning
                st.markdown("#### 📊 Detailed Breakdown")
                
                dimensions = [
                    ("Expertise", scores.get('expertise_score', 0), scores.get('expertise_reasoning', ''), "25%"),
                    ("Performance", scores.get('performance_score', 0), scores.get('performance_reasoning', ''), "30%"),
                    ("Reliability", scores.get('reliability_score', 0), scores.get('reliability_reasoning', ''), "25%"),
                    ("Quality", scores.get('quality_score', 0), scores.get('quality_reasoning', ''), "15%"),
                    ("Engagement", scores.get('engagement_score', 0), scores.get('engagement_reasoning', ''), "5%")
                ]
                
                for dim_name, score, reasoning, weight in dimensions:
                    with st.expander(f"**{dim_name}** ({weight}): {score:.0f}/100"):
                        st.write(reasoning if reasoning else "No reasoning provided")
                
                # Radar Chart
                fig = go.Figure(data=go.Scatterpolar(
                    r=[scores.get('expertise_score', 0), scores.get('performance_score', 0), 
                       scores.get('reliability_score', 0), scores.get('quality_score', 0), 
                       scores.get('engagement_score', 0)],
                    theta=['Expertise (25%)', 'Performance (30%)', 'Reliability (25%)', 'Quality (15%)', 'Engagement (5%)'],
                    fill='toself',
                    name='AI Scores'
                ))
                fig.update_layout(polar=dict(radialaxis=dict(visible=True, range=[0, 100])), showlegend=False, height=400)
                st.plotly_chart(fig, width="stretch")
                
                # Save Report
                if st.button("💾 Save AI Report"):
                    report = {
                        "parsed_data": parsed_data,
                        "scores": scores,
                        "admin_recommendation": admin_rec,
                        "tier_prediction": analysis_result.get('tier_prediction', 'Unknown'),
                        "documents_analyzed": len(st.session_state.documents),
                        "sources": [doc.get("source_type") for doc in st.session_state.documents],
                        "scoring_method": "AI (Single Comprehensive Analysis)",
                        "timestamp": analysis_result.get('timestamp', '')
                    }
                    path = save_json(report, "AI_COMPREHENSIVE_REPORT")
                    st.success(f"Saved to {path}")
    
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