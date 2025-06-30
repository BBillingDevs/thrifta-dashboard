export default function getChatId(a, b) {
    return [a, b].sort().join("_");
}
