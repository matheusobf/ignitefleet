import { useNavigation, useRoute } from '@react-navigation/native';
import { AsyncMessage, Container, Content, Description, Footer, Label, LicensePlate } from './styles';
import { Header } from '../../components/Header';
import { Button } from '../../components/Button';
import { ButtonIcon } from '../../components/ButtonIcon';
import { X } from 'phosphor-react-native';
import { useObject, useRealm } from '../../libs/realm';
import { Historic } from '../../libs/realm/schemas/Historic';
import { BSON } from 'realm';
import { Alert } from 'react-native';
import { useEffect, useState } from 'react';
import { getLastAsyncTimestamp } from '../../libs/asyncStorage/syncStorage';
import { stopLocationTask } from '../../tasks/backgroundLocationTask';
import { getStorageLocations } from '../../libs/asyncStorage/locationStorage';
import { LatLng } from 'react-native-maps';
import { Map } from '../../components/Map';
import { Locations } from '../../components/Locations';
import { getAddressLocation } from '../../utils/getAddressLocation';
import { LocationInfoProps } from '../../components/LocationInfo';
import dayjs from 'dayjs';
import { Loading } from '../../components/Loading';

export function Arrival() {
    const [dataNotSynced, setDataNotSynced] = useState(false)
    const [coordinates, setCoordinates] = useState<LatLng[]>([])
    const [departure, setDeparture] = useState<LocationInfoProps>({} as LocationInfoProps)
    const [arrival, setArrival] = useState<LocationInfoProps | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const routes = useRoute()
    const { id } = routes.params as { id: string }
    const historic = useObject(Historic, new BSON.UUID(id))
    const realm = useRealm()
    const { goBack } = useNavigation()
    const title = historic?.status === "departure" ? "Chegada" : "Detalhes"
    function handleRemoveVehicleUsage() {
        Alert.alert("Cancelar", "Cancelar a utilização do veículo?", [
            {
                text: "Não",
                style: "cancel"
            },
            {
                text: "Sim",
                onPress: () => removeVehicleUsage()
            }
        ])
    }
    async function removeVehicleUsage() {
        realm.write(() => {
            realm.delete(historic)
        })
        await stopLocationTask()
        goBack()
    }
    async function handleArrivalRegister() {
        try {
            if (!historic) {
                Alert.alert("Error", "Não foi possível obter os dados para registrar a chegada do veículo.")
            }
            const locations = await getStorageLocations()
            if (historic) {
                realm.write(() => {
                    historic.status = 'arrival'
                    historic.updated_at = new Date()
                    historic.coords.push(...locations)
                })
                await stopLocationTask()
                Alert.alert("Chegada", "Chegada do veículo registrada com sucesso.")
                goBack()
            } else {
                Alert.alert("Erro", "Não foi possível registar a chegada do veículo.")
            }
        } catch (error) {
            console.log(error)
            Alert.alert("Erro", "Não foi possível registar a chegada do veículo.")
        }
    }
    async function getLocationsInfo(){
        if(!historic) return
        const lastSync = await getLastAsyncTimestamp()
        const updatedAt = historic!.updated_at.getTime()
        setDataNotSynced(updatedAt > lastSync)
        if(historic?.status === "departure"){
            const locationsStorage = await getStorageLocations()
            setCoordinates(locationsStorage)
        } else {
            setCoordinates(historic?.coords ?? [])
        }
        if(historic?.coords[0]){
            const departureStreetName = await getAddressLocation(historic?.coords[0])
            setDeparture({
                label: `Saindo em ${departureStreetName ?? "Localização desconhecida"}`,
                description: dayjs(new Date(historic?.coords[0].timestamp)).format("DD/MM/YYYY [às] HH:mm")
            })
        }
        if(historic?.status === "arrival"){
            const lasLocation = historic.coords[historic.coords.length - 1]
            const arrivalStreetName = await getAddressLocation(lasLocation)
            setArrival({
                label: `Chegando em ${arrivalStreetName ?? "Localização desconhecida"}`,
                description: dayjs(new Date(lasLocation.timestamp)).format("DD/MM/YYYY [às] HH:mm")
            })
        }
        setIsLoading(false)
    }
    useEffect(() => {
        getLocationsInfo()
    }, [historic])
    if(isLoading){
        return <Loading />
    }
    return (
        <Container>
            <Header title={title} />
            {coordinates.length > 0 && <Map coordinates={coordinates} />}
            <Content>
                <Locations arrival={arrival} departure={departure} />
                <Label>Placa do veículo</Label>
                <LicensePlate>{historic?.license_plate}</LicensePlate>
                <Label>Finalidade</Label>
                <Description>{historic?.description}</Description>
            </Content>
            {historic?.status === "departure" && (
                <Footer>
                    <ButtonIcon icon={X} onPress={handleRemoveVehicleUsage} />
                    <Button title='Registar Chegada' onPress={handleArrivalRegister} />
                </Footer>
            )}
            {dataNotSynced && (
                <AsyncMessage>Sincronização da {historic?.status === "departure" ? "partida" : "chegada"} pendente</AsyncMessage>
            )}
        </Container>
    );
}