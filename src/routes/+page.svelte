<script>
    import { page } from "$app/state";
    async function test(){
        console.log('working')
    const schemaResponse = await fetch(`${page.url.origin}/api/agent/v1/vision`, {
                    method: 'POST',
                    headers: {
                        'X-API-Key': 'fortuna-major',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        prompt: 'a table',
                        imageUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSnO89DlUhKcTRg4IteNYEfCFMk5_ZPsPIGnw&s',
                        questionOnly: false
                    })
                });
                console.log(await schemaResponse.json())
                }
</script>

<h1>Welcome to Spellshape Agent API</h1>
<p>Visit <a href="https://spellshape.com">spellshape.com</a> to learn more</p>
<!-- <button onclick={test}>test</button> -->