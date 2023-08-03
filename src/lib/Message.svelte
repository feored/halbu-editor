<script context="module">
    export const Message = {
        ValidSave: Symbol("Valid Save" ),
        CharacterPicked: Symbol("Character Picked"),
        CharacterUnpicked: Symbol("Character Unpicked"),
        SaveFile: Symbol("Save File")
    };

    

    export function buildMessage(messageType, messageContents){
        return {
            id: messageType,
            data: messageContents
        };
    }

</script>