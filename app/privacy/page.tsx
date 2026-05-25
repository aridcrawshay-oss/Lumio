export default function PrivacyPage() {
  return (
    <div style={{maxWidth:680,margin:'0 auto',padding:'40px 24px',fontFamily:'Inter, sans-serif',color:'#eeeeff',minHeight:'100vh',background:'#09090f'}}>
      <h1 style={{fontFamily:'Syne, sans-serif',marginBottom:8}}>Privacy Policy</h1>
      <p style={{color:'#9898bb',fontSize:12,marginBottom:24}}>Lumio — operated from Australia</p>
      <p style={{marginBottom:16,lineHeight:1.7}}>This policy explains how Lumio handles your data.</p>
      <h2 style={{fontFamily:'Syne, sans-serif',fontSize:16,margin:'24px 0 8px'}}>What we collect</h2>
      <p style={{lineHeight:1.7,marginBottom:12}}>Email, name, and the study content you create. Notes you upload are used only to power AI features and are not shared beyond the AI provider.</p>
      <h2 style={{fontFamily:'Syne, sans-serif',fontSize:16,margin:'24px 0 8px'}}>AI processing</h2>
      <p style={{lineHeight:1.7,marginBottom:12}}>Your prompts are sent to an AI provider to generate responses. We do not use your data to train models.</p>
      <h2 style={{fontFamily:'Syne, sans-serif',fontSize:16,margin:'24px 0 8px'}}>Data storage</h2>
      <p style={{lineHeight:1.7,marginBottom:12}}>Stored in Supabase on AWS (US). By using Lumio you consent to this.</p>
      <h2 style={{fontFamily:'Syne, sans-serif',fontSize:16,margin:'24px 0 8px'}}>Your rights</h2>
      <p style={{lineHeight:1.7,marginBottom:12}}>Delete your account anytime from Settings. Contact: privacy@lumio.app</p>
    </div>
  )
}
