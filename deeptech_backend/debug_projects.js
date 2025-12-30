import pool from './config/db.js';

async function debugProjects() {
  try {
    console.log('=== Debugging Project Status Filtering ===\n');
    
    // Get all projects
    const allResult = await pool.query('SELECT id, title, status, client_id FROM projects ORDER BY created_at DESC');
    console.log('📊 All Projects in Database:');
    console.table(allResult.rows);
    
    // Test status filtering for each status
    const statuses = ['draft', 'active', 'completed', 'archived'];
    
    for (const status of statuses) {
      const result = await pool.query(
        'SELECT id, title, status FROM projects WHERE client_id = $1 AND status = $2',
        [allResult.rows[0]?.client_id, status]
      );
      console.log(`\n🔍 Projects with status='${status}':`, result.rows.length);
      if (result.rows.length > 0) {
        console.table(result.rows);
      }
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

debugProjects();
