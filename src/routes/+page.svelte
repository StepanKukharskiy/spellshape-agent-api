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
                        imageUrl: 'https://assets.vogue.com/photos/589172dae8e3104f57c736b6/master/w_2560,c_limit/01-holding-inscape.jpg',
                        questionOnly: false
                    })
                });
                console.log(await schemaResponse.json())
                }
</script>

<h1>Welcome to Spellshape Agent API</h1>
<p>Visit <a href="https://spellshape.com">spellshape.com</a> to learn more</p>
<!-- <button onclick={test}>test</button> -->