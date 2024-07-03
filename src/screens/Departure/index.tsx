import { useEffect, useRef, useState } from 'react';
import { Button } from '../../components/Button';
import { Header } from '../../components/Header';
import { LicensePlateInput } from '../../components/LicensePlateInput';
import { TextAreaInput } from '../../components/TextAreaInput';
import { Container, Content, Message } from './styles';
import { TextInput, ScrollView, Alert } from 'react-native';
import { licensePlateValidate } from '../../utils/licensePlateValidate';
import { useRealm } from '../../libs/realm';
import { Historic } from '../../libs/realm/schemas/Historic';
import { useUser } from "@realm/react"
import { useNavigation } from '@react-navigation/native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view'
import { useForegroundPermissions, watchPositionAsync, LocationAccuracy, LocationSubscription, LocationObjectCoords } from "expo-location"
import { getAddressLocation } from '../../utils/getAddressLocation';
import { Loading } from '../../components/Loading';
import { LocationInfo } from '../../components/LocationInfo';
import { Car } from 'phosphor-react-native';
import { Map } from '../../components/Map';

export function Departure() {
  const [description, setDescription] = useState("")
  const [licensePlate, setLicensePlate] = useState("")
  const [isRegistering, setIsRegistering] = useState(false)
  const [isLoadingLocation, setIsLoadingLocation] = useState(true)
  const [currentAddress, setCurrentAddress] = useState<string | null>(null)
  const [currentCoords, setCurrentCoords] = useState<LocationObjectCoords | null>(null)
  const [locationForegroundPermission, requestLocationForegroundPermission] = useForegroundPermissions()
  const descriptionRef = useRef<TextInput>(null)
  const licensePlateRef = useRef<TextInput>(null)
  const realm = useRealm()
  const user = useUser()
  const { goBack } = useNavigation()
  function handleDepartureRegister() {
    try {
      if (!licensePlateValidate(licensePlate)) {
        licensePlateRef.current?.focus()
        return Alert.alert("Placa inválida", "A placa é válida, por favor, informe a placa correta do veículo.")
      }
      if (description.trim().length === 0) {
        descriptionRef.current?.focus()
        return Alert.alert("Finalidade ", "Por favor, informe a finalidade da utilização do veículo.")
      }
      setIsRegistering(true)
      realm.write(() => {
        realm.create("Historic", Historic.generate({ user_id: user!.id, license_plate: licensePlate.toUpperCase(), description }))
      })
      Alert.alert("Saída", "Saída do veículo registrada com sucesso!")
      goBack()
    } catch (error) {
      setIsRegistering(false)
      console.log(error)
      Alert.alert("Erro", "Não foi possível registrar a saída do veículo.")
    }
  }
  useEffect(() => {
    requestLocationForegroundPermission()
  }, [])
  useEffect(() => {
    if (!locationForegroundPermission?.granted) {
      return
    }
    let subscription: LocationSubscription
    watchPositionAsync({
      accuracy: LocationAccuracy.High,
      timeInterval: 1000
    }, (location) => {
      setCurrentCoords(location.coords)
      getAddressLocation(location.coords).then((address) => {
        if(address){
          setCurrentAddress(address)
        }
      }).finally(() => setIsLoadingLocation(false))
    }).then((response) => {
      subscription = response
    })
    return () => {
      if (subscription) {
        subscription.remove()
      }
    }
  }, [locationForegroundPermission])
  if (!locationForegroundPermission?.granted) {
    return (
      <Container>
        <Header title="Saída" />
        <Message>Você precisa permitir que o aplicativo tenha acesso a localização para utilizar essa funcionalidade. Por favor acesse as configurações do seu dispositivo para conceder essa permissão ao aplicativo.</Message>
      </Container>
    )
  }
  if (isLoadingLocation) {
    return (
      <Loading />
    )
  }
  return (
    <Container>
      <Header title="Saída" />
      <KeyboardAwareScrollView extraHeight={100}>
        <ScrollView>
          {currentCoords && <Map coordinates={[currentCoords]} />}
          <Content>
            {currentAddress && <LocationInfo label="Localização" description={currentAddress} icon={Car} />}
            <LicensePlateInput ref={licensePlateRef} onChangeText={setLicensePlate} label="Placa do veículo" placeholder="BRA1234" onSubmitEditing={() => descriptionRef.current?.focus()} returnKeyType="next" />
            <TextAreaInput onChangeText={setDescription} ref={descriptionRef} label="Finalidade" placeholder="Vou utilizar o veículo para..." onSubmitEditing={handleDepartureRegister} returnKeyType="send" blurOnSubmit />
            <Button title="Registrar Saída" onPress={handleDepartureRegister} isLoading={isRegistering} />
          </Content>
        </ScrollView>
      </KeyboardAwareScrollView>
    </Container>
  );
}