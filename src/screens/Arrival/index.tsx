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

export function Arrival() {
    const [dataNotSynced, setDataNotSynced] = useState(false)
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
    function removeVehicleUsage() {
        realm.write(() => {
            realm.delete(historic)
        })
        goBack()
    }
    function handleArrivalRegister() {
        try {
            if (!historic) {
                Alert.alert("Error", "Não foi possível obter os dados para registrar a chegada do veículo.")
            }
            if (historic) {
                realm.write(() => {
                    historic.status = 'arrival'
                    historic.updated_at = new Date()
                })
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
    useEffect(() => {
        getLastAsyncTimestamp().then(lastSync => {
            setDataNotSynced(historic!.updated_at.getTime() > lastSync)
        })
    }, [])
    return (
        <Container>
            <Header title={title} />
            <Content>
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