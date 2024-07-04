import { reverseGeocodeAsync } from "expo-location"

type Props = {
    latitude: number
    longitude: number
}

export async function getAddressLocation({ latitude, longitude }: Props){
    try{
        const addressResponse = await reverseGeocodeAsync({ latitude, longitude })
        const streetName = addressResponse[0]?.street ?? addressResponse[0]?.name
        return streetName
    } catch(error){
        console.log(error)
    }
}