<script module>
    export const Message = {
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
